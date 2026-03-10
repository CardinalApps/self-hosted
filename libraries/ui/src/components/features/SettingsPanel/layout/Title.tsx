import H5 from '../../../typography/H5'

const titleField = (title) => () => {
  return Object.freeze({
    type: 'title',
    render: () => {
      return (
        <H5 className="settings-section-title">{title}</H5>
      )
    },
  })
}

export default titleField
