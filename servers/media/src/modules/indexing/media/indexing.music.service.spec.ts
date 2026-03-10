import { Test } from '@nestjs/testing'

import { AppModule } from '../../app/app.module'

import { MusicIndexingService } from './indexing.music.service'

describe('MusicIndexingService', () => {
  let musicIndexingService: MusicIndexingService

  beforeEach(async () => {
    const moduleRef = await Test
      .createTestingModule({
        imports: [AppModule],
      })
      .compile()

    musicIndexingService = moduleRef.get<MusicIndexingService>(MusicIndexingService)
  })

  describe('Music indexing', () => {
    describe('Find metadata in folder structure', () => {
      test('Disc number', async () => {
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD-2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/Disc 2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/Disc2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/Disc-2/09 Psychopomp.mp3'))
          .toEqual(2)
        expect(musicIndexingService.findDiscNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(null)
      })
      test('Artist name', async () => {
        expect(musicIndexingService.findArtistNameInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual('Thank You Scientist')
        expect(musicIndexingService.findArtistNameInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual('Thank You Scientist')
      })
      test('Release name', async () => {
        expect(musicIndexingService.findReleaseNameInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual('Stranger Heads Prevail')
        expect(musicIndexingService.findReleaseNameInFolderStructure('/home/user1/music/Thank You Scientist/2016Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual('2016Stranger Heads Prevail')
        expect(musicIndexingService.findReleaseNameInFolderStructure('/home/user1/music/Thank You Scientist/2016 - Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual('Stranger Heads Prevail')
        expect(musicIndexingService.findReleaseNameInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual('Stranger Heads Prevail')
        expect(musicIndexingService.findReleaseNameInFolderStructure('/home/user1/music/Thank You Scientist/2016-Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual('Stranger Heads Prevail')
      })
      test('Release year', async () => {
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/09 Psychopomp.mp3'))
          .toEqual(2016)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/(2016) Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(2016)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/2016 Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(2016)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/2016-Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(2016)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/2016 - Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(2016)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/2016Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(null)
        expect(musicIndexingService.findReleaseYearInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(null)
      })
      test('Track name', async () => {
        expect(musicIndexingService.findTrackNameInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/Psychopomp.mp3'))
          .toEqual('Psychopomp')
        expect(musicIndexingService.findTrackNameInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual('Psychopomp')
        expect(musicIndexingService.findTrackNameInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 - Psychopomp.mp3'))
          .toEqual('Psychopomp')
      })
      test('Track number', async () => {
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/[2016] Stranger Heads Prevail/CD 2/9 Psychopomp.mp3'))
          .toEqual(9)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 Psychopomp.mp3'))
          .toEqual(9)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09-Psychopomp.mp3'))
          .toEqual(9)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/09 - Psychopomp.mp3'))
          .toEqual(9)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/(0009) Psychopomp.mp3'))
          .toEqual(9)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Thank You Scientist/Stranger Heads Prevail/Psychopomp.mp3'))
          .toEqual(null)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Dream Theater/[2002] Six Degrees of Inner Turbulence/1-04 - The Great Debate.flac'))
          .toEqual(4)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Dream Theater/[2002] Six Degrees of Inner Turbulence/(2-7) - The Great Debate.flac'))
          .toEqual(7)
        expect(musicIndexingService.findTrackNumberInFolderStructure('/home/user1/music/Dream Theater/[2002] Six Degrees of Inner Turbulence/02-10 - The Great Debate.flac'))
          .toEqual(10)
      })
    })
  })
})
