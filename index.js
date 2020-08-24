/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { EventGridClient } = require("@azure/eventgrid");

/*
 * Maintains a cache of secrets from the given Azure Key Vault and
 * updates the cache when receiving an Event Grid notification.
 */
module.exports = class EventDrivenSecretCache {

  _secretCache;
  _secretClient;

  /*
  * Maintains a cache of secrets from the given Azure Key Vault and
  * updates the cache when receiving an Event Grid notification.
  */
  constructor(expressServer) {
    this._secretCache = {};
  }

  async init() {
    // DefaultAzureCredential expects the following three environment variables:
    // * AZURE_TENANT_ID: The tenant ID in Azure Active Directory
    // * AZURE_CLIENT_ID: The application (client) ID registered in the AAD tenant
    // * AZURE_CLIENT_SECRET: The client secret for the registered application
    const credential = new DefaultAzureCredential();

    // Build the URL to reach our key vault
    const vaultName = process.env['AZURE_KEYVAULT_NAME'];
    if(!vaultName)
      throw new Error('EventDrivenSecretCache requires the Azure Key Vault Name to be present in the process environment variables.');
    const url = `https://${vaultName}.vault.azure.net`;

    // Lastly, create our secrets client and connect to the service
    this._secretClient = new SecretClient(url, credential);

    for await (let secretProperty of this._secretClient.listPropertiesOfSecrets()) {
      const secretName = secretProperty.name;
      const secretValue = await this._secretClient.getSecret(secretName);
      this._secretCache[secretName] = secretValue.value;
    }
  }

  async updateSecret(secretName) {
    const newSecretValue = await this._secretClient.getSecret(secretName);
    console.log('newSecretValue: ' + newSecretValue);
    this._secretCache[secretName] = newSecretValue;
  }

  get secrets() {
    return this._secretCache;
  }
}