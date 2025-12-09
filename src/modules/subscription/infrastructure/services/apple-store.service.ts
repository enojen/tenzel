import { readFileSync } from 'fs';

import {
  AppStoreServerAPIClient,
  Environment,
  ReceiptUtility,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
  type StatusResponse,
} from '@apple/app-store-server-library';

import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('apple-store-service');

export class AppleStoreService {
  private client: AppStoreServerAPIClient;
  private verifier: SignedDataVerifier;
  private receiptUtil = new ReceiptUtility();

  constructor() {
    const env =
      process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;

    const keyPath = process.env.APPLE_KEY_PATH;
    const keyId = process.env.APPLE_KEY_ID;
    const issuerId = process.env.APPLE_ISSUER_ID;
    const bundleId = process.env.APPLE_BUNDLE_ID;

    if (!keyPath || !keyId || !issuerId || !bundleId) {
      throw new Error('Missing required Apple configuration');
    }

    const encodedKey = readFileSync(keyPath, 'utf-8');

    this.client = new AppStoreServerAPIClient(encodedKey, keyId, issuerId, bundleId, env);

    const rootCAG3Path = process.env.APPLE_ROOT_CA_G3_PATH;
    const rootCAG2Path = process.env.APPLE_ROOT_CA_G2_PATH;

    if (!rootCAG3Path || !rootCAG2Path) {
      throw new Error('Missing Apple Root CA certificate paths');
    }

    const appleRootCAs = [readFileSync(rootCAG3Path), readFileSync(rootCAG2Path)];

    const appAppleId = process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined;

    this.verifier = new SignedDataVerifier(appleRootCAs, true, env, bundleId, appAppleId);

    logger.info({ environment: env }, 'AppleStoreService initialized');
  }

  async validateReceipt(receipt: string): Promise<JWSTransactionDecodedPayload> {
    const transactionId = this.receiptUtil.extractTransactionIdFromAppReceipt(receipt);

    if (!transactionId) {
      throw new Error('No transaction found in receipt');
    }

    logger.debug({ transactionId }, 'Extracting transaction info from receipt');

    const response = await this.client.getTransactionInfo(transactionId);

    if (!response.signedTransactionInfo) {
      throw new Error('No signed transaction info in response');
    }

    return this.verifier.verifyAndDecodeTransaction(response.signedTransactionInfo);
  }

  async verifyWebhookNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload> {
    return this.verifier.verifyAndDecodeNotification(signedPayload);
  }

  async getSubscriptionStatus(transactionId: string): Promise<StatusResponse> {
    return this.client.getAllSubscriptionStatuses(transactionId);
  }
}
