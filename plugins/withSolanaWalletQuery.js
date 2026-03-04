const { withAndroidManifest } = require('@expo/config-plugins');

function hasSolanaWalletQuery(manifest) {
    const queries = manifest.queries || [];
    for (const query of queries) {
        const intents = query.intent || [];
        for (const intent of intents) {
            const dataEntries = intent.data || [];
            for (const data of dataEntries) {
                if (data?.$?.['android:scheme'] === 'solana-wallet') {
                    return true;
                }
            }
        }
    }
    return false;
}

module.exports = function withSolanaWalletQuery(config) {
    return withAndroidManifest(config, (configWithManifest) => {
        const manifest = configWithManifest.modResults.manifest;

        if (hasSolanaWalletQuery(manifest)) {
            return configWithManifest;
        }

        if (!manifest.queries) {
            manifest.queries = [];
        }

        manifest.queries.push({
            intent: [
                {
                    action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
                    category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
                    data: [{ $: { 'android:scheme': 'solana-wallet' } }],
                },
            ],
        });

        return configWithManifest;
    });
};
