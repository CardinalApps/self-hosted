import Card from '@cardinalapps/ui/src/components/layout/Card'

import './styles.css'

import { HOME_SERVER_HOST } from '../../env'

type PhotoCardProps = {
  thumbnailUrl: string,
}

function PhotoCard({
  thumbnailUrl,
}: PhotoCardProps) {
  return (
    <Card className="photoCard" bg={1} shadow={3} border={0} padding={'thin'}>
      <header style={{ backgroundImage: `url(${HOME_SERVER_HOST}${thumbnailUrl})` }}></header>
    </Card>
  )
}

export default PhotoCard
