/**
 * Copyright 2017 trivago N.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as n from 'melody-types'
import { Types, setEndFromToken, setStartFromToken } from '../../../melody-parser/src/'
import { copyEnd, createNode } from '../../../melody-parser/src/util'
import { UrlStatement } from './../types'

export const UrlParser = {
  name: 'url',
  parse(parser, token) {
    const tokens = parser.tokens

    const urlStatement = new UrlStatement(parser.matchExpression())

    let args = []
    while (!tokens.test(Types.EOF) && !tokens.test(Types.TAG_END)) {
      if (tokens.test(Types.SYMBOL) && tokens.lat(1) === Types.ASSIGNMENT) {
        const name = tokens.next()
        tokens.next()
        const value = parser.matchExpression()
        const arg = new n.NamedArgumentExpression(createNode(n.Identifier, name, name.text), value)
        copyEnd(arg, value)
        args.push(arg)
      } else {
        args.push(parser.matchExpression())
      }

      if (tokens.test(Types.SYMBOL) && tokens.lat(0) === 'as') {
        tokens.next()
        urlStatement.as = this.matchExpression()
      }
    }

    urlStatement.arguments = args

    setStartFromToken(urlStatement, token)
    setEndFromToken(urlStatement, tokens.expect(Types.TAG_END))

    return urlStatement
  }
}
