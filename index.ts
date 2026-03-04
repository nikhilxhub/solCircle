// Polyfills must load at app entry before expo-router initializes screens/providers.
import "./src/core/polyfill";
import "expo-router/entry";
