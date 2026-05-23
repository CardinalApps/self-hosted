import { JourneyCoverageReporter } from '@cardinalapps/e2e-helpers'
import { JOURNEYS } from '../journeys'

export default class extends JourneyCoverageReporter {
  constructor() {
    super(JOURNEYS)
  }
}
