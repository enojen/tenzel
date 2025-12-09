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

import { config } from '@/config';
import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('apple-store-service');

export class AppleStoreService {
  private client: AppStoreServerAPIClient;
  private verifier: SignedDataVerifier;
  private receiptUtil = new ReceiptUtility();

  constructor() {
    const env = config.app.isProduction ? Environment.PRODUCTION : Environment.SANDBOX;

    const { keyPath, keyId, issuerId, bundleId, rootCAG3Path, rootCAG2Path, appId } =
      config.subscription.apple;

    if (!keyPath || !keyId || !issuerId || !bundleId) {
      throw new Error(
        'Apple Store integration is not configured. Please set APPLE_KEY_PATH, APPLE_KEY_ID, APPLE_ISSUER_ID, and APPLE_BUNDLE_ID in your environment variables.',
      );
    }

    const encodedKey = readFileSync(keyPath, 'utf-8');

    this.client = new AppStoreServerAPIClient(encodedKey, keyId, issuerId, bundleId, env);

    if (!rootCAG3Path || !rootCAG2Path) {
      throw new Error(
        'Apple Root CA certificate paths are not configured. Please set APPLE_ROOT_CA_G3_PATH and APPLE_ROOT_CA_G2_PATH in your environment variables.',
      );
    }

    const appleRootCAs = [readFileSync(rootCAG3Path), readFileSync(rootCAG2Path)];

    this.verifier = new SignedDataVerifier(appleRootCAs, true, env, bundleId, appId);

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
