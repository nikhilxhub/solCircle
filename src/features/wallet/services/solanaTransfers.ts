import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
    Connection,
    LAMPORTS_PER_SOL,
    ParsedAccountData,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import { TokenBalance } from '@/shared/types';
import { isWalletUserDeclinedError } from '@/features/wallet/services/walletErrors';

export const SOL_SENTINEL_MINT = 'SOL';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function sanitizeAmountInput(amount: string): string {
    return amount.trim().replace(',', '.');
}

export function amountToRaw(amount: string, decimals: number): bigint {
    const normalized = sanitizeAmountInput(amount);

    if (!/^\d+(\.\d+)?$/.test(normalized)) {
        throw new Error('Invalid amount format');
    }

    const [whole, fraction = ''] = normalized.split('.');
    const paddedFraction = `${fraction}${'0'.repeat(decimals)}`.slice(0, decimals);
    return BigInt(`${whole}${paddedFraction}`);
}

export function rawToAmountUi(raw: bigint, decimals: number): string {
    const rawStr = raw.toString().padStart(decimals + 1, '0');
    const whole = rawStr.slice(0, rawStr.length - decimals);
    const fraction = rawStr.slice(rawStr.length - decimals).replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole;
}

export function isValidPublicKey(value: string): boolean {
    try {
        // eslint-disable-next-line no-new
        new PublicKey(value);
        return true;
    } catch {
        return false;
    }
}

export async function fetchTokenBalances(connection: Connection, owner: PublicKey): Promise<TokenBalance[]> {
    const solLamports = await connection.getBalance(owner, 'confirmed');

    const parsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
    });

    const balancesByMint = new Map<string, TokenBalance>();

    for (const tokenAccount of parsedTokenAccounts.value) {
        const parsedData = tokenAccount.account.data as ParsedAccountData;
        const info = parsedData.parsed.info as {
            mint: string;
            tokenAmount: {
                amount: string;
                decimals: number;
            };
        };

        const mintAddress = info.mint;
        const decimals = info.tokenAmount.decimals;
        const rawAmount = BigInt(info.tokenAmount.amount);

        if (balancesByMint.has(mintAddress)) {
            const previous = balancesByMint.get(mintAddress)!;
            const nextRaw = BigInt(previous.amountRaw) + rawAmount;
            balancesByMint.set(mintAddress, {
                ...previous,
                amountRaw: nextRaw.toString(),
                amountUi: rawToAmountUi(nextRaw, decimals),
                tokenAccountAddress:
                    BigInt(previous.amountRaw) > 0n
                        ? previous.tokenAccountAddress
                        : tokenAccount.pubkey.toBase58(),
            });
            continue;
        }

        const shortMint = `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
        balancesByMint.set(mintAddress, {
            mintAddress,
            symbol: shortMint,
            amountRaw: rawAmount.toString(),
            amountUi: rawToAmountUi(rawAmount, decimals),
            decimals,
            isNative: false,
            tokenAccountAddress: tokenAccount.pubkey.toBase58(),
        });
    }

    const tokens: TokenBalance[] = [
        {
            mintAddress: SOL_SENTINEL_MINT,
            symbol: 'SOL',
            amountRaw: solLamports.toString(),
            amountUi: (solLamports / LAMPORTS_PER_SOL).toFixed(6).replace(/0+$/, '').replace(/\.$/, ''),
            decimals: 9,
            isNative: true,
        },
        ...Array.from(balancesByMint.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    ];

    return tokens;
}

function addMemoInstructionIfPresent(transaction: Transaction, memo?: string) {
    if (!memo || !memo.trim()) {
        return;
    }

    transaction.add(
        new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memo.trim(), 'utf8'),
        })
    );
}

async function signSendAndConfirm(
    connection: Connection,
    signTransaction: ((transaction: Transaction) => Promise<Transaction>) | undefined,
    signAndSendTransaction: (transaction: Transaction, minContextSlot: number) => Promise<string>,
    transaction: Transaction
): Promise<string> {
    const latest = await connection.getLatestBlockhashAndContext('confirmed');
    transaction.recentBlockhash = latest.value.blockhash;

    let signature: string;

    if (signTransaction) {
        try {
            const signedTx = await signTransaction(transaction);
            signature = await connection.sendRawTransaction(signedTx.serialize(), {
                preflightCommitment: 'confirmed',
            });
        } catch (error) {
            if (isWalletUserDeclinedError(error)) {
                throw error;
            }

            console.warn('signTransaction flow failed, falling back to signAndSendTransaction', {
                message: error instanceof Error ? error.message : String(error),
            });
            signature = await signAndSendTransaction(transaction, latest.context.slot);
        }
    } else {
        signature = await signAndSendTransaction(transaction, latest.context.slot);
    }

    await connection.confirmTransaction(
        {
            blockhash: latest.value.blockhash,
            lastValidBlockHeight: latest.value.lastValidBlockHeight,
            signature,
        },
        'confirmed'
    );

    return signature;
}

export async function sendSolTransfer(params: {
    connection: Connection;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction: (transaction: Transaction, minContextSlot: number) => Promise<string>;
    from: PublicKey;
    to: PublicKey;
    amountUi: string;
    memo?: string;
}): Promise<string> {
    const lamports = amountToRaw(params.amountUi, 9);

    if (lamports <= 0n) {
        throw new Error('Amount must be greater than zero');
    }

    const transaction = new Transaction();
    transaction.feePayer = params.from;
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: params.from,
            toPubkey: params.to,
            lamports: Number(lamports),
        })
    );

    addMemoInstructionIfPresent(transaction, params.memo);

    return signSendAndConfirm(params.connection, params.signTransaction, params.signAndSendTransaction, transaction);
}

export async function sendSplTransfer(params: {
    connection: Connection;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    signAndSendTransaction: (transaction: Transaction, minContextSlot: number) => Promise<string>;
    owner: PublicKey;
    destinationOwner: PublicKey;
    mintAddress: string;
    sourceTokenAccountAddress: string;
    amountUi: string;
    decimals: number;
    memo?: string;
}): Promise<string> {
    const mint = new PublicKey(params.mintAddress);
    const sourceTokenAccount = new PublicKey(params.sourceTokenAccountAddress);
    const destinationAta = getAssociatedTokenAddressSync(
        mint,
        params.destinationOwner,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const rawAmount = amountToRaw(params.amountUi, params.decimals);
    if (rawAmount <= 0n) {
        throw new Error('Amount must be greater than zero');
    }

    const transaction = new Transaction();
    transaction.feePayer = params.owner;

    const destinationInfo = await params.connection.getAccountInfo(destinationAta, 'confirmed');
    if (!destinationInfo) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                params.owner,
                destinationAta,
                params.destinationOwner,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
    }

    transaction.add(
        createTransferInstruction(
            sourceTokenAccount,
            destinationAta,
            params.owner,
            rawAmount,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    addMemoInstructionIfPresent(transaction, params.memo);

    return signSendAndConfirm(params.connection, params.signTransaction, params.signAndSendTransaction, transaction);
}
