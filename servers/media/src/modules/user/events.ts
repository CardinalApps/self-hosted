export enum UserEvents {
  CREATE_OWNER = `user.create_owner`,
}

export type CreateOwnerEventPayload = {
  serverName: string,
  jwt: string,
}
