import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import './SearchBar.css'

type SearchBarProps = {
  size?: 'l' | 'm',
  placeholder?: string,
  onChange?: (e, value) => void,
}

/**
 * Allows the user to input search queries.
 */
const SearchBar = ({
  size = "m",
  placeholder = 'Search',
  onChange = () => {},
}: PropsWithChildren<SearchBarProps>) => {
  const [query, setQuery] = useState('')

  const handleChange = (e) => {
    setQuery(e.target.value)
    onChange(e, e.target.value)
  }

  return (
    <div className={clsx('search-bar', `size-${size}`)}>
      <label>
        <i className="fas fa-search"></i>
        <input
          type="search"
          name="query"
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
        />
      </label>
    </div>
  )
}

export default SearchBar
