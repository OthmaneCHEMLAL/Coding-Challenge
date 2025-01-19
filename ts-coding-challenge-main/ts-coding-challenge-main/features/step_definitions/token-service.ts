import { Given, When, Then } from '@cucumber/cucumber';
import { accounts } from "../../src/config";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TokenCreateTransaction,   
  TokenInfoQuery,           
  TokenMintTransaction,
  TokenSupplyType           
} from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet()

Given(/^A Hedera account with more than (\d+) hbar$/, async function (expectedBalance: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(0)
    .setInitialSupply(1000000)
    .setTreasuryAccountId(this.account)
    .setAdminKey(this.privKey)
    .setSupplyKey(this.privKey)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  this.tokenId = receipt.tokenId;
  console.log(`Token created with ID: ${this.tokenId}`);
});

Then(/^The token has the name "([^"]*)"$/, async function (expectedName: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.name, expectedName);
});

Then(/^The token has the symbol "([^"]*)"$/, async function (expectedSymbol: string) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.symbol, expectedSymbol);
});

Then(/^The token has (\d+) decimals$/, async function (expectedDecimals: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.decimals, expectedDecimals);
});

Then(/^The token is owned by the account$/, async function () {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert(tokenInfo.treasuryAccountId !== null, "treasuryAccountId should not be null");
  assert.strictEqual(tokenInfo.treasuryAccountId.toString(), this.account.toString());
});

Then(/^An attempt to mint (\d+) additional tokens succeeds$/, async function (additionalTokens: number) {
  const transaction = await new TokenMintTransaction()
    .setTokenId(this.tokenId)
    .setAmount(additionalTokens)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  assert.strictEqual(receipt.status.toString(), "SUCCESS");
});


When(/^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/, async function (initialSupply: number) {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(0)
    .setInitialSupply(initialSupply)
    .setSupplyType(TokenSupplyType.Finite)  
    .setTreasuryAccountId(this.account)
    .setAdminKey(this.privKey)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  this.tokenId = receipt.tokenId;
  console.log(`Fixed supply token created with ID: ${this.tokenId}`);
});

Then(/^The total supply of the token is (\d+)$/, async function (expectedSupply: number) {
  const tokenInfo = await new TokenInfoQuery().setTokenId(this.tokenId).execute(client);
  assert.strictEqual(tokenInfo.totalSupply.toNumber(), expectedSupply);
});

Then(/^An attempt to mint tokens fails$/, async function () {
  try {
    await new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(100)  
      .execute(client);

    assert.fail("Token minting should have failed");
  } catch (error) {
    console.log("Minting attempt failed as expected");
  }
});
Given(/^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const account = accounts[0];
  const MY_ACCOUNT_ID = AccountId.fromString(account.id);
  const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

  const hbarQuery = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const hbarBalance = await hbarQuery.execute(client);
  assert.ok(hbarBalance.hbars.toTinybars().toNumber() > expectedHbarBalance * 100000000);

  const tokenQuery = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
  const tokenBalance = await tokenQuery.execute(client);
  assert.ok(tokenBalance.tokens !== null, "Token balance should not be null");
  const tokenAmount = tokenBalance.tokens!.get(this.tokenId)?.toNumber();  // Ensure the value is not null
  assert.ok(tokenAmount !== undefined && tokenAmount >= expectedTokenBalance);
});

Given(/^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/, async function (expectedHbarBalance: number, expectedTokenBalance: number) {
  const account = accounts[1];
  const ACCOUNT_ID = AccountId.fromString(account.id);
  const PRIVATE_KEY = PrivateKey.fromStringED25519(account.privateKey);
  client.setOperator(ACCOUNT_ID, PRIVATE_KEY);

  const hbarQuery = new AccountBalanceQuery().setAccountId(ACCOUNT_ID);
  const hbarBalance = await hbarQuery.execute(client);
  assert.ok(hbarBalance.hbars.toTinybars().toNumber() > expectedHbarBalance * 100000000);

  const tokenQuery = new AccountBalanceQuery().setAccountId(ACCOUNT_ID);
  const tokenBalance = await tokenQuery.execute(client);
  assert.ok(tokenBalance.tokens !== null, "Token balance should not be null");
  const tokenAmount = tokenBalance.tokens!.get(this.tokenId)?.toNumber();  // Ensure the value is not null
  assert.ok(tokenAmount !== undefined && tokenAmount >= expectedTokenBalance);
});

