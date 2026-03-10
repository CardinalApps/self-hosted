type Option = {
  name: string,
  default: string | boolean | null | undefined,
}

// FIXME move this to the db service
export const OPTIONS = {
  DATABASE_VERSION: <Option>{
    name: 'database_version',
    default: null,
  },
  FIRST_TIME_SETUP_DONE: <Option>{
    name: 'first_time_setup_done',
    default: false,
  },
  // This assumes the user is running the stable release
  CURRENT_CONTAINER_VERSION: <Option>{
    name: 'current_container_released_at',
    default: undefined,
  },
  LAST_CHECKED_FOR_UPDATES_AT: <Option>{
    name: 'last_checked_for_updates_at',
    default: undefined,
  },
  INSTALLED_AT: <Option>{
    name: 'installed_at',
    default: undefined,
  },
  INSTANCE_ID: <Option>{
    name: 'instance_id',
    default: undefined,
  },
  CLAIMED_AT: <Option>{
    name: 'claimed_at',
    default: undefined,
  },
  CLAIM_ID: <Option>{
    name: 'claim_id',
    default: undefined,
  },
}
