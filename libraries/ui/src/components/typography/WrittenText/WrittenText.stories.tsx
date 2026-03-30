import type { Meta, StoryObj } from '@storybook/react'

import WrittenText from './WrittenText'

const meta = {
  title: 'Typography/WrittenText',
  component: WrittenText,
  argTypes: {},
} satisfies Meta<typeof WrittenText>
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: `
      <h1>The quick red Cardinal jumped over the lazy dog</h1>
      <h2>The quick red Cardinal jumped over the lazy dog</h2>
      <h3>The quick red Cardinal jumped over the lazy dog</h3>
      <h4>The quick red Cardinal jumped over the lazy dog</h4>
      <h5>The quick red Cardinal jumped over the lazy dog</h5>
      <h6>The quick red Cardinal jumped over the lazy dog</h6>

      <p>Cardinal Media Server is a self-hosted media streaming platform. <strong>Your media stays on hardware you own</strong>, served over a connection you control. Depending on your setup, Cardinal can run on a home server, a VPS, a NAS device, or even a Raspberry Pi.</p>
      <code>
function streamTrack(trackId) {
  const url = api.getStreamUrl(trackId)
  audioPlayer.load(url)
  audioPlayer.play()
}
      </code>
      <p><strong>Cardinal Music</strong> lets you <a href="#" target="_blank">stream your music collection</a> from anywhere. It supports FLAC, MP3, AAC, and most other common audio formats.</p>
      <p><em>Cardinal Photos</em> organises your photo library with albums, faces, and location-based browsing. It can run AI-powered image recognition entirely on your own hardware.</p>
      <p>To configure the server port, set <code>CARDINAL_MEDIA_PORT</code> in your environment before starting the server.</p>

      <div class="arrow-link"><a href="#">Read the setup guide</a></div>

      <ul>
        <li>Cardinal Music — audio streaming</li>
        <li>
          Cardinal Photos — photo management
          <ul>
            <li>Albums</li>
            <li>Face recognition</li>
            <li>Map view</li>
          </ul>
        </li>
        <li>Cardinal Cinema — video streaming</li>
      </ul>

      <ol>
        <li>Install Cardinal Media Server</li>
        <li>Add your media directories</li>
        <li>Run the library scanner</li>
        <li>Connect your apps</li>
      </ol>

      <img src="/images/1.jpg" alt="Test image">
    `,
  },
}

export default meta
