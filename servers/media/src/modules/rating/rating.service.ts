import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Rating, RatingMediaType } from './rating.entity'
import { MusicTrack } from '../music-track/music-track.entity'
import { User } from '../user/user.entity'
import { SetRatingDto } from './dtos/SetRating.dto'
import { GetRatingsDto } from './dtos/GetRatings.dto'

const FAVORITE_THRESHOLD = 1

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  /**
   * Set or update a rating for a media item.
   */
  async upsertRating(user: User, setRatingDto: SetRatingDto): Promise<Rating> {
    const { mediaType, mediaId, rating } = setRatingDto

    const existing = await this.ratingRepository.findOne({
      where: {
        user: { id: user.id },
        mediaType,
        mediaId,
      },
    })

    const saved = await this.ratingRepository.save({
      ...(existing ? { id: existing.id } : {}),
      rating,
      mediaType,
      mediaId,
      user,
    })

    delete saved.user
    return saved
  }

  /**
   * Remove a rating for a media item.
   */
  async deleteRating(user: User, mediaType: RatingMediaType, mediaId: string): Promise<void> {
    const existing = await this.ratingRepository.findOne({
      where: {
        user: { id: user.id },
        mediaType,
        mediaId,
      },
    })

    if (!existing) {
      throw new NotFoundException('Rating not found.')
    }

    await this.ratingRepository.remove(existing)
  }

  /**
   * Query ratings for the current user. Pass a mediaType to filter by type and
   * hydrate the associated media object on each rating.
   */
  async query(user: User, getRatingsDto: GetRatingsDto, type?: RatingMediaType): Promise<[Rating[], number]> {
    const { take, skip, sort, order, favorites } = getRatingsDto

    const qb = this.ratingRepository.createQueryBuilder('rating')
      .where('rating.user_id = :userId', { userId: user.id })
      .orderBy(`rating.${sort}`, order)
      .take(take)
      .skip(skip)

    if (type) {
      qb.andWhere('rating.media_type = :type', { type })
    }

    if (type === RatingMediaType.MUSIC_TRACK) {
      qb.leftJoinAndMapOne('rating.media', MusicTrack, 'track', 'track.music_track_id = rating.media_id')
        .leftJoinAndSelect('track.release', 'release')
        .leftJoinAndSelect('release.thumbnails', 'thumbnails')
        .leftJoinAndSelect('track.artists', 'artists')
    }

    if (favorites) {
      qb.andWhere('rating.rating = :threshold', { threshold: FAVORITE_THRESHOLD })
    }

    return await qb.getManyAndCount()
  }

}
