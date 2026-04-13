import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Rating } from './rating.entity'
import { MusicTrackService } from '../music-track/music-track.service'
import { User } from '../user/user.entity'
import { SetRatingDto } from './dtos/SetRating.dto'
import { GetRatingsDto } from './dtos/GetRatings.dto'

const FAVORITE_THRESHOLD = 1

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,

    private readonly musicTrackService: MusicTrackService,
  ) {}

  /**
   * Set or update a rating for a music track.
   */
  async upsertRating(user: User, setRatingDto: SetRatingDto): Promise<Rating> {
    const track = await this.musicTrackService.get(setRatingDto.trackId)

    if (!track) {
      throw new NotFoundException('Music track not found.')
    }

    const existing = await this.ratingRepository.findOne({
      where: {
        user: { id: user.id },
        track: { id: track.id },
      },
    })

    return await this.ratingRepository.save({
      ...(existing ? { id: existing.id } : {}),
      rating: setRatingDto.rating,
      track,
      user,
    })
  }

  /**
   * Remove a rating for a music track.
   */
  async deleteRating(user: User, trackId: string): Promise<void> {
    const existing = await this.ratingRepository.findOne({
      where: {
        user: { id: user.id },
        track: { musicTrackId: trackId },
      },
    })

    if (!existing) {
      throw new NotFoundException('Rating not found.')
    }

    await this.ratingRepository.remove(existing)
  }

  /**
   * Query ratings for the current user.
   */
  async query(user: User, getRatingsDto: GetRatingsDto): Promise<[Rating[], number]> {
    const { take, skip, sort, order, favorites } = getRatingsDto

    const qb = this.ratingRepository.createQueryBuilder('rating')
      .where('rating.user_id = :userId', { userId: user.id })
      .leftJoinAndSelect('rating.track', 'track')
      .leftJoinAndSelect('track.release', 'release')
      .leftJoinAndSelect('release.thumbnails', 'thumbnails')
      .leftJoinAndSelect('track.artists', 'artists')
      .orderBy(`rating.${sort}`, order)
      .take(take)
      .skip(skip)

    if (favorites) {
      qb.andWhere('rating.rating = :threshold', { threshold: FAVORITE_THRESHOLD })
    }

    return await qb.getManyAndCount()
  }

}
