/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import models = require('../models/index')
import { Request, Response, NextFunction } from 'express'
import { User } from '../data/types'

const security = require('../lib/insecurity')
const utils = require('../lib/utils')
const cache = require('../data/datacache')
const challenges = cache.challenges

module.exports = function updateUserProfile () {
  return (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)

    if (loggedInUser) {
      models.User.findByPk(loggedInUser.data.id).then((user: User) => {
        utils.solveIf(challenges.csrfChallenge, () => {
          return ((req.headers.origin?.includes('://htmledit.squarefree.com')) ??
            (req.headers.referer?.includes('://htmledit.squarefree.com'))) &&
            req.body.username !== user.username
        })
        void user.update({ username: req.body.username }).then((savedUser: User) => {
          savedUser = utils.queryResultToJson(savedUser)
          const updatedToken = security.authorize(savedUser)
          security.authenticatedUsers.put(updatedToken, savedUser)
          res.cookie('token', updatedToken)
          res.location(process.env.BASE_PATH + '/profile')
          res.redirect(process.env.BASE_PATH + '/profile')
        })
      }).catch((error: Error) => {
        next(error)
      })
    } else {
      next(new Error('Blocked illegal activity by ' + req.connection.remoteAddress))
    }
  }
}
