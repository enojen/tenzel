import { Elysia } from 'elysia';

import {
  subscriptionResponseSchema,
  defaultAssetsResponseSchema,
  type SubscriptionResponse,
  type DefaultAssetsResponse,
} from './config.schemas';

const SUBSCRIPTION_CONFIG: SubscriptionResponse = {
  subscription: {
    price: 99.99,
    currency: 'TRY',
    period: 'monthly',
    features: [
      'Sınırsız varlık takibi',
      'Gelişmiş grafikler',
      'Fiyat alarmları',
      'Reklamsız deneyim',
      'Öncelikli destek',
    ],
    description: 'Premium üyelik ile tüm özelliklere erişin',
  },
};

const DEFAULT_ASSETS_CONFIG: DefaultAssetsResponse = {
  assets: [
    {
      code: 'GRAM_GOLD',
      type: 'commodity',
      name: 'Gram Altın',
      logoUrl: '/assets/icons/gold.png',
    },
    {
      code: 'USD',
      type: 'currency',
      name: 'Amerikan Doları',
      logoUrl: '/assets/icons/usd.png',
    },
    {
      code: 'EUR',
      type: 'currency',
      name: 'Euro',
      logoUrl: '/assets/icons/eur.png',
    },
  ],
};

export function configController() {
  return new Elysia()
    .get(
      '/subscription',
      () => {
        return SUBSCRIPTION_CONFIG;
      },
      {
        response: {
          200: subscriptionResponseSchema,
        },
        detail: {
          summary: 'Get subscription pricing',
          description: 'Returns paywall configuration with subscription pricing and features',
          tags: ['Config'],
        },
      },
    )
    .get(
      '/default-assets',
      () => {
        return DEFAULT_ASSETS_CONFIG;
      },
      {
        response: {
          200: defaultAssetsResponseSchema,
        },
        detail: {
          summary: 'Get default assets',
          description: 'Returns default home screen assets for new users',
          tags: ['Config'],
        },
      },
    );
}
