/**
 * @file The content of this file appears in the app UIs and also on the public
 * help.cardinalapps.io site.
 */

export type Languages = 'en'
export type StringList = Record<string, Record<Languages, string>>

export const ACi18n: StringList = {
  /**
   * Owner
   */
  "role.owner.name": {
    "en": "Owner",
  },
  "role.owner.description": {
    "en": `
      <p>The Owner role is the most powerful role, with unrestricted capabilities. It is automatically assigned to the first Cardinal Account that logs into the server, and can only be removed by performing a factory reset.</p>
      <p>It grants the user complete administrative control over the server, allowing them to invite users, delegate roles, index media, and more.</p>
      <p>The Owner role also links the Media Server to Cardinal's Cloud, allowing the Media Server to use the features included in the owner's subscription. It is the only role that is limited to a single user.</p>
    `,
  },

  /**
   * Administrator
   */
  "role.administrator.name": {
    "en": "Administrator",
  },
  "role.administrator.description": {
    "en": `
      <p>The Administrator role is a powerful role with the same capabilities as the Owner role, but it can be assigned to multiple users, and does not trigger any Cardinal Cloud side effects.</p>
      <p>It is automatically assigned to the Guest Account, allowing users to access all of their server's features without needing to create a Cardinal account. It cannot be revoked from the Guest Account.</p>
    `,
  },

  /**
   * Media Apps User
   */
  "role.media_apps_user.name": {
    "en": "Media Apps User",
  },
  "role.media_apps_user.description": {
    "en": `
      <p>The Media Apps User role grants access to all media apps, allowing the user to access the Music, Photos, and Cinema apps, and also future media applications.</p>
      <p>It is the ideal role for someone that should have access to everything except the Administration app.</p>
    `,
  },

  /**
   * Music User
   */
  "role.music_user.name": {
    "en": "Music User",
  },
  "role.music_user.description": {
    "en": `
      <p>The Music User role grants access exclusively to the Music app and all of its features.</p>
    `,
  },

  /**
   * Photos User
   */
  "role.photos_user.name": {
    "en": "Photos User",
  },
  "role.photos_user.description": {
    "en": `
      <p>The Photos User role grants access exclusively to the Photos app and all of its features.</p>
    `,
  },

  /**
   * Cinema User
   */
  "role.cinema_user.name": {
    "en": "Cinema User",
  },
  "role.cinema_user.description": {
    "en": `
      <p>The Cinema User role grants access exclusively to the Cinema app and all of its features.</p>
    `,
  },

  /**
   * Administrator
   */
  "role.administrator.name": {
    "en": "Administrator",
  },
  "role.administrator.description": {
    "en": `
      <p>The Administrator role is a powerful role with the same capabilities as the Owner role, but it can be assigned to multiple users, and does not trigger any Cardinal Cloud side effects.</p>
      <p>It is automatically assigned to the Guest Account, allowing users to access all of their server's features without needing to create a Cardinal account. It cannot be revoked from the Guest Account.</p>
    `,
  },

  /**
   * Media Apps User
   */
  "role.media_apps_user.name": {
    "en": "Media Apps User",
  },
  "role.media_apps_user.description": {
    "en": `
      <p>The Media Apps User role grants access to all media apps, allowing the user to access the Music, Photos, and Cinema apps, and also future media applications.</p>
      <p>It is the ideal role for someone that should have access to everything except the Administration app.</p>
    `,
  },

  /**
   * Music User
   */
  "role.music_user.name": {
    "en": "Music User",
  },
  "role.music_user.description": {
    "en": `
      <p>The Music User role grants access exclusively to the Music app and all of its features.</p>
    `,
  },

  /**
   * Photos User
   */
  "role.photos_user.name": {
    "en": "Photos User",
  },
  "role.photos_user.description": {
    "en": `
      <p>The Photos User role grants access exclusively to the Photos app and all of its features.</p>
    `,
  },

  /**
   * Cinema User
   */
  "role.cinema_user.name": {
    "en": "Cinema User",
  },
  "role.cinema_user.description": {
    "en": `
      <p>The Cinema User role grants access exclusively to the Cinema app and all of its features.</p>
    `,
  },

  /**
   * Newcomer
   */
  "role.newcomer.name": {
    "en": "Newcomer",
  },
  "role.newcomer.description": {
    "en": `
      <p>The Newcomer role is the default role assigned to users when they first join your server. It lets users log into the apps, but does not allow them to access any media.</p>
      <p>The role exists as a waiting room for new users, allowing server administrators to start each new user from a position of least privilege.</p>
    `,
  },
}

export default ACi18n
