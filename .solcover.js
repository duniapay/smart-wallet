module.exports = {
  client: require('ganache-cli'),
  measureStatementCoverage: false,
  measureFunctionCoverage: false,
  skipFiles: [
    "../contracts-test",
    "../lib_0.5",
    "../lib_0.7"
  ],
  providerOptions: {
    port: 8555,
    _chainId: 1895,
    network_id: 1597649375983,
    account_keys_path: "./ganache-accounts.json",
    default_balance_ether: 10000
  }
};