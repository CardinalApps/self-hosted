import SearchBar from '@cardinalapps/ui/src/components/interaction/SearchBar'

import i18n from './i18n.json'

import './styles.css'

function Search() {
  const handleChange = (e) => {
    console.log(e.target.value)
  }

  // const handleSubmit = (e) => {
  //   e.preventDefault()
  //   console.log(e)
  // }

  return (
    <div className="search">
      <SearchBar
        placeholder={i18n['placeholder']['en']}
        onChange={handleChange}
      />
    </div>
  )
}

export default Search
