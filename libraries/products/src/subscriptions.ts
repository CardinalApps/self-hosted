export enum SubscriptionTierSlug {
  FREE = 'free',
  EARLY_ADOPTER = 'early_adopter',
  STARTER = 'starter',
  PRO = 'pro',
  ULTIMATE = 'ultimate',
}

type localizedStrings = {
  [lang: string]: string,
}

/**
 * A single subscription as advertised on https://cardinalapps.io/pricing
 */
export type SubscriptionTier = {
  name: localizedStrings,
  slug: string,
  provides: {
    seats: number,
    popularity_data_pool: boolean,
    // How many Media Servers may hold an active Remote Access credential.
    // Flat 1 on every tier while the relay cost model is unproven.
    remote_access_slots: number,
  },
  prices: {
    // Use the "Lookup Key" in Stripe for each price
    monthly?: string,
    yearly?: string,
  },
}

/**
 * All subscriptions with their final values.
 * 
 * Use underscores for slugs.
 */
export const SUBSCRIPTIONS = {
  free: {
    name: {
      en: "Free",
    },
    slug: "free",
    provides: {
      seats: 2,
      popularity_data_pool: true,
      remote_access_slots: 1,
    },
    prices: {},
  },
  /**
   * Now retired
   */
  early_adopter: {
    name: {
      en: "Early Adopter",
    },
    slug: "early_adopter",
    provides: {
      seats: 10,
      popularity_data_pool: true,
      remote_access_slots: 1,
    },
    prices: {
      monthly: 'early_adopter',
    },
  },
  starter: {
    name: {
      en: "Starter",
    },
    slug: "starter",
    provides: {
      seats: 5,
      popularity_data_pool: true,
      remote_access_slots: 1,
    },
    prices: {
      monthly: 'starter_monthly',
      yearly: 'starter_yearly',
    },
  },
  pro: {
    name: {
      en: "Pro",
    },
    slug: "pro",
    provides: {
      seats: 20,
      popularity_data_pool: true,
      remote_access_slots: 1,
    },
    prices: {
      monthly: 'pro_monthly',
      yearly: 'pro_yearly',
    },
  },
  ultimate: {
    name: {
      en: "Ultimate",
    },
    slug: "ultimate",
    provides: {
      seats: 40,
      popularity_data_pool: true,
      remote_access_slots: 1,
    },
    prices: {
      monthly: 'ultimate_monthly',
      yearly: 'ultimate_yearly',
    },
  },
} as Record<SubscriptionTierSlug, SubscriptionTier>

/**
 * Primary API for getting a subscription.
 */
export const getSubscription = (slug: `${SubscriptionTierSlug}`): SubscriptionTier | null => {
  if (slug in SUBSCRIPTIONS) {
    return SUBSCRIPTIONS[slug as SubscriptionTierSlug]
  } else {
    return null
  }
}

export default SUBSCRIPTIONS
