import React from 'react'
import { useSelector } from 'react-redux'
import { TargetAndTransition, motion } from 'framer-motion'

import H2 from '@cardinalapps/ui/src/components/typography/H2'
import Button from '@cardinalapps/ui/src/components/interaction/Button'
import Card from '@cardinalapps/ui/src/components/layout/Card'

import CardinalAdminSSOButton from '../../../components/CardinalAdminSSOButton'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import authAPI from '@cardinalapps/ui/src/lib/auth/authAPI'
import { UserType } from '@cardinalapps/ui/src/types/user'

import i18n from '../i18n.json'

import '../styles.css'

type LoginProps = {
  next: () => void,
  prev: () => void,
  cardAnimation: TargetAndTransition,
  userObjectOfFutureOwner: Record<string, unknown>,
  setUserObjectOfFutureOwner: (user: Record<string, unknown>) => void,
  setSsoJWTOfFutureOwner: React.Dispatch<React.SetStateAction<string>>,
  overrideServerName: string,
}

function Login({
  next,
  prev,
  cardAnimation,
  userObjectOfFutureOwner,
  setUserObjectOfFutureOwner,
  setSsoJWTOfFutureOwner,
  overrideServerName,
}: LoginProps) {
  const { lang } = useSelector(settingsSelectors.current)
  const loggedIn = !!Object.keys(userObjectOfFutureOwner).length

  /**
   * During the first time setup the cloud user is scoped to just this
   * component. The login isn't final until the setup is complete.
   */
  const onSSOSuccess = (JWT) => {
    authAPI('/user', 'GET', {
      JWT: JWT,
    })
      .then((user) => {
        setUserObjectOfFutureOwner(user as UserType)
        setSsoJWTOfFutureOwner(JWT)
      })
      .catch((error) => {
        console.error('Could not load user', error)
      })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={cardAnimation}
      >
        <Card
          className={'card'}
          padding="thick"
          icon={<i className="fas fa-stamp" />}
          iconSize="l"
          header={<H2 className={'title'}>{i18n['login.title'][lang]}</H2>}
          footer={
            <>
              <div>
                <Button onClick={prev} textual={true}>
                  {i18n['prev'][lang]}
                </Button>
                <Button onClick={next} textual={true}>
                  {i18n['next'][lang]}
                </Button>
              </div>
            </>
          }
        >
          <div dangerouslySetInnerHTML={{ __html: i18n['login.overview'][lang] }} />

          <div className={'loginButton'}>
            {loggedIn
              ?
                <p className={'currentUser'}>
                  <i className="fas fa-check" /> {i18n['login.logged-in-as']['en'].replace('{name}', userObjectOfFutureOwner?.publicName || i18n['login.no-public-name-set'][lang])}
                </p>
              : <CardinalAdminSSOButton
                  onSSOSuccess={onSSOSuccess}
                  saveJWTInLocalStorage={false}
                  overrideServerName={overrideServerName}
                />
            }
          </div>
        </Card>
      </motion.div>
    </>
  )
}

export default Login
