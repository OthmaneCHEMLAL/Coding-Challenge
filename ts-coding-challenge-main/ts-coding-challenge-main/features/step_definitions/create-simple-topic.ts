import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey, RequestType,
  TopicCreateTransaction, TopicInfoQuery,
  TopicMessageQuery, TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;
import { KeyList } from "@hashgraph/sdk";

const client = Client.forTestnet()


Given(/^a first account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[0]
  const account: AccountId = AccountId.fromString(acc.id);
  this.account = account
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.privKey = privKey
  client.setOperator(this.account, privKey);

 
  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client)
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance)
});

When(/^A topic is created with the first account as the submit key$/, async function () {
  const transaction = await new TopicCreateTransaction()
    .setSubmitKey(this.privKey)
    .execute(client);
    
  const receipt = await transaction.getReceipt(client);
  this.topicId = receipt.topicId;
  console.log(`Topic created with ID: ${this.topicId}`);
});

When(/^The message "([^"]*)" is published to the topic$/, async function (message: string) {
  const submitMessage = await new TopicMessageSubmitTransaction()
    .setTopicId(this.topicId)
    .setMessage(message)
    .execute(client);
    
  const receipt = await submitMessage.getReceipt(client);
  assert.ok(receipt.status.toString() === "SUCCESS");
});

Then(/^The message "([^"]*)" is received by the topic and can be printed to the console$/, async function (expectedMessage: string) {
  const query = new TopicMessageQuery().setTopicId(this.topicId);

  query.subscribe(
    client,
    (error) => {
      if (error) {
        console.error("Error receiving message:", error);
      }
    },
    (message) => {
      const receivedMessage = Buffer.from(message.contents).toString('utf-8');
      console.log(`Received message: ${receivedMessage}`);
      assert.strictEqual(receivedMessage, expectedMessage);
    }
  );
});



Given(/^A second account with more than (\d+) hbars$/, async function (expectedBalance: number) {
  const acc = accounts[1];
  const account: AccountId = AccountId.fromString(acc.id);
  this.secondAccount = account;
  const privKey: PrivateKey = PrivateKey.fromStringED25519(acc.privateKey);
  this.secondPrivKey = privKey;

  const query = new AccountBalanceQuery().setAccountId(account);
  const balance = await query.execute(client);
  assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
});
Given(/^A (\d+) of (\d+) threshold key with the first and second account$/, async function (threshold: number, total: number) { this.thresholdKey = new KeyList([this.privKey.publicKey, this.secondPrivKey.publicKey], threshold); });

When(/^A topic is created with the threshold key as the submit key$/, async function () {
  const transaction = await new TopicCreateTransaction()
    .setSubmitKey(this.thresholdKey)
    .execute(client);
    
  const receipt = await transaction.getReceipt(client);
  this.thresholdTopicId = receipt.topicId;
  console.log(`Topic with threshold key created with ID: ${this.thresholdTopicId}`);
});
