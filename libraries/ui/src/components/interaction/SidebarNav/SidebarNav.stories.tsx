import type { Meta } from '@storybook/react'

import SidebarNav from './SidebarNav'

const meta = {
  title: 'Interaction/SidebarNav',
  component: SidebarNav,
  argTypes: {},
} satisfies Meta<typeof SidebarNav>

const navItems = [
  { icon: 'fas fa-grip', label: 'Browse' },
  { icon: 'fas fa-compass', label: 'Explore' },
  { icon: 'fas fa-record-vinyl', label: 'Albums' },
]

const secondaryItems = [
  { icon: 'fas fa-star', label: 'Favourites' },
  { icon: 'fas fa-user', label: 'My Account' },
]

export const Default = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav>
        <li className="active" key="browse">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-grip" />
            <span>Browse</span>
          </a>
        </li>
        <li key="explore">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-compass" />
            <span>Explore</span>
          </a>
        </li>
        <li key="albums">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-record-vinyl" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Library</p>
        <li key="favourites">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-star" />
            <span>Favourites</span>
          </a>
        </li>
        <li key="account">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-user" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

export const Thin = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav size="thin">
        <li className="active" key="browse">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-grip" />
            <span>Browse</span>
          </a>
        </li>
        <li key="explore">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-compass" />
            <span>Explore</span>
          </a>
        </li>
        <li key="albums">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-record-vinyl" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Library</p>
        <li key="favourites">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-star" />
            <span>Favourites</span>
          </a>
        </li>
        <li key="account">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-user" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

const manyItems = [
  { icon: 'fas fa-grip', label: 'Browse', section: null },
  { icon: 'fas fa-compass', label: 'Explore', section: null },
  { icon: 'fas fa-record-vinyl', label: 'Albums', section: null },
  { icon: 'fas fa-music', label: 'Artists', section: 'Library' },
  { icon: 'fas fa-list', label: 'Playlists', section: null },
  { icon: 'fas fa-star', label: 'Favourites', section: null },
  { icon: 'fas fa-clock', label: 'Recently Added', section: null },
  { icon: 'fas fa-headphones', label: 'Recently Played', section: null },
  { icon: 'fas fa-download', label: 'Downloads', section: 'Manage' },
  { icon: 'fas fa-folder', label: 'Media Folders', section: null },
  { icon: 'fas fa-sliders', label: 'Equalizer', section: null },
  { icon: 'fas fa-gear', label: 'Settings', section: 'Account' },
  { icon: 'fas fa-user', label: 'My Account', section: null },
  { icon: 'fas fa-circle-question', label: 'Help', section: null },
]

export const Overflow = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav overflow={true}>
        {manyItems.map(({ icon, label, section }, i) => [
          section && <p key={`section-${i}`} className="section">{section}</p>,
          <li key={label} className={i === 0 ? 'active' : ''}>
            <a href="#" onClick={(e) => e.preventDefault()}>
              <i className={icon} />
              <span>{label}</span>
            </a>
          </li>,
        ])}
      </SidebarNav>
    </div>
  )
}

export const Collapseable = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav showCollapseButton={true}>
        <li className="active" key="browse">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-grip" />
            <span>Browse</span>
          </a>
        </li>
        <li key="explore">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-compass" />
            <span>Explore</span>
          </a>
        </li>
        <li key="albums">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-record-vinyl" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Library</p>
        <li key="favourites">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-star" />
            <span>Favourites</span>
          </a>
        </li>
        <li key="account">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-user" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

export default meta
