import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { CorsOrigin } from './cors-origin.entity'
import { DatabaseService } from '../database/database.service'
import { OPTIONS } from '../../utils/options'

// Any Cardinal hosted app, with or without a subdomain. HTTPS only.
const CARDINAL_HOSTED_APPS_REGEX = /^https:\/\/([a-z0-9-]+\.)*cardinalapps\.io$/i

// Loopback development origins on any port. HTTP only.
const LOCALHOST_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

/**
 * Decides which cross-origin callers may use the API, and manages the
 * user-configurable extra origins that are persisted in the database.
 */
@Injectable()
export class CorsService {
  // The custom origins table rarely changes, so it is cached in memory and
  // invalidated on writes. CORS runs on every request and cannot afford a
  // query per lookup.
  private customOriginsCache: Set<string> | null = null

  constructor(
    @InjectRepository(CorsOrigin)
    private readonly corsOriginRepository: Repository<CorsOrigin>,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Returns whether a request from the given Origin header value is allowed
   * to use the API. An undefined origin means a same-origin or non-browser
   * caller, which is always allowed.
   */
  async isOriginAllowed(origin: string | undefined): Promise<boolean> {
    if (!origin) {
      return true
    }

    if (CARDINAL_HOSTED_APPS_REGEX.test(origin)) {
      return true
    }

    if (LOCALHOST_REGEX.test(origin)) {
      return true
    }

    if (await this.matchesOwnHostname(origin)) {
      return true
    }

    const customOrigins = await this.getCustomOriginSet()
    return customOrigins.has(origin)
  }

  /**
   * Returns all user-configured custom origins.
   */
  async getCustomOrigins(): Promise<CorsOrigin[]> {
    return await this.corsOriginRepository.find()
  }

  /**
   * Validates, normalizes, and persists a custom origin. Returns the existing
   * row when the origin is already in the allowlist.
   */
  async addCustomOrigin(origin: string, addedByUserId?: string): Promise<CorsOrigin> {
    const normalized = normalizeOrigin(origin)

    if (!normalized) {
      throw new BadRequestException('The origin must be a well-formed http:// or https:// URL.')
    }

    const existing = await this.corsOriginRepository.findOne({ where: { origin: normalized } })
    if (existing) {
      return existing
    }

    const saved = await this.corsOriginRepository.save({
      origin: normalized,
      addedByUserId,
    })

    this.customOriginsCache = null

    return saved
  }

  /**
   * Removes a custom origin by its UUID. Returns whether a row was deleted.
   */
  async removeCustomOrigin(corsOriginId: string): Promise<boolean> {
    const result = await this.corsOriginRepository.delete({ corsOriginId })

    this.customOriginsCache = null

    return !!result.affected
  }

  // Matches the origin's hostname against the server's own hostnames (the
  // Cardinal-assigned one and the user's BYO one), ignoring scheme and port —
  // it's the same Media Server regardless of which port the client used
  private async matchesOwnHostname(origin: string): Promise<boolean> {
    let originHostname: string
    try {
      originHostname = new URL(origin).hostname.toLowerCase()
    } catch {
      return false
    }

    const ownHostnames = [
      await this.databaseService.getOption(OPTIONS.CONNECT_HOSTNAME.name),
      await this.databaseService.getOption(OPTIONS.CONNECT_BYO_HOSTNAME.name),
    ]

    return ownHostnames.some((hostname) => {
      return typeof hostname === 'string' && !!hostname && hostname.toLowerCase() === originHostname
    })
  }

  // Loads the custom origins into the cache on first use
  private async getCustomOriginSet(): Promise<Set<string>> {
    if (!this.customOriginsCache) {
      const rows = await this.corsOriginRepository.find()
      this.customOriginsCache = new Set(rows.map((row) => row.origin))
    }

    return this.customOriginsCache
  }
}

/**
 * Normalizes user input to a bare origin (scheme + host + port), or returns
 * null when the input is not a well-formed http(s) URL.
 */
export function normalizeOrigin(input: string): string | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  if (!url.hostname) {
    return null
  }

  return url.origin
}
