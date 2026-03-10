import type { Meta } from '@storybook/react'

import SidebarNav from './SidebarNav'

const meta = {
  title: 'Interaction/SidebarNav',
  component: SidebarNav,
  argTypes: {},
} satisfies Meta<typeof SidebarNav>

export const Default = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav>
        <li className="active" key="1">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-baby" />
            <span>Browse</span>
          </a>
        </li>
        <li key="2">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="3">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="4">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="5">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
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
        <li className="active" key="1">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-baby" />
            <span>Browse</span>
          </a>
        </li>
        <li key="2">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="3">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="4">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="5">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

export const Overflow = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav overflow={true}>
        <li className="active" key="1">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-baby" />
            <span>Browse</span>
          </a>
        </li>
        <li key="2">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="3">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="4">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="5">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
        <li key="6">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="7">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="8">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="9">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
        <li key="10">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="11">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="12">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="13">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
        <li key="14">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="15">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="16">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="17">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li><li key="18">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="19">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="20">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="21">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

export const Collapseable = () => {
  return (
    <div style={{ width: 250, position: 'fixed', top: 20, left: 0, bottom: 20 }}>
      <SidebarNav
        showCollapseButton={true}
      >
        <li className="active" key="1">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-baby" />
            <span>Browse</span>
          </a>
        </li>
        <li key="2">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-egg" />
            <span>Explore</span>
          </a>
        </li>
        <li key="3">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-chess" />
            <span>Albums</span>
          </a>
        </li>
        <p className="section">Section title</p>
        <li key="4">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bowling-ball" />
            <span>Photos & Faces</span>
          </a>
        </li>
        <li key="5">
          <a href="#" onClick={(e) => e.preventDefault()}>
            <i className="fas fa-ring" />
            <span>My Account</span>
          </a>
        </li>
      </SidebarNav>
    </div>
  )
}

export default meta
