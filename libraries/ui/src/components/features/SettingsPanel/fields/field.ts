/**
 * A template object that gets cloned and frozen for each field.
 *
 * slug: the option key used when saving the value.
 * label: Human readable name for the field.
 * options: Possible values.
 * description: Optional.
 * longDescription: Optional.
 * type: one of the fieldTypes.
 * render: Optional custom render function.
 */
const field = {
  slug: null,
  label: null,
  options: {},
  description: null,
  type: null,
  defaultValue: null,
  render: () => '(Field needs render function)',
}

const fieldTypes = {
  select: 'select',
  toggle: 'toggle',
  textArea: 'textArea',
  swatches: 'swatches',
}

export { fieldTypes }
export default field
