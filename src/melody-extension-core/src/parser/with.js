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
import { Types, createNode, hasTagEndTokenTrimRight, hasTagStartTokenTrimLeft, setEndFromToken, setStartFromToken } from '../../../melody-parser/src/'
import { copyEnd } from '../../../melody-parser/src/util'
import { WithStatement } from './../types'

export const WithParser = {
  name: 'with',
  parse(parser, token) {
    const tokens = parser.tokens,
      tagStartToken = tokens.la(-2)

    let withStatement, openingTagEndToken, closingTagStartToken

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
        const value = parser.matchExpression()
        if (tokens.nextIf(Types.SYMBOL, 'as')) {
          const name = tokens.next()
          const arg = new n.NamedArgumentExpression(createNode(n.Identifier, name, name.text), value)
          copyEnd(arg, value)
          args.push(arg)
        } else {
          const unexpectedToken = tokens.next()
          parser.error({
            title: 'with arguments mismatch',
            pos: unexpectedToken.pos,
            advice: 'eg: {% with alpha=1 beta=2 %}'
          })
        }
      }
    }

    if ((openingTagEndToken = tokens.nextIf(Types.TAG_END))) {
      withStatement = new WithStatement(
        parser.parse((tokenText, token, tokens) => {
          const result = !!(token.type === Types.TAG_START && tokens.nextIf(Types.SYMBOL, 'endwith'))
          if (result) {
            closingTagStartToken = token
          }
          return result
        }).expressions
      )
    } else {
      withStatement = new WithStatement(new PrintExpressionStatement(parser.matchExpression()))
    }

    withStatement.arguments = args

    setStartFromToken(withStatement, token)
    setEndFromToken(withStatement, tokens.expect(Types.TAG_END, null, tagStartToken))

    withStatement.trimRightBlock = openingTagEndToken && hasTagEndTokenTrimRight(openingTagEndToken)
    withStatement.trimLeftEndblock = !!(closingTagStartToken && hasTagStartTokenTrimLeft(closingTagStartToken))

    return withStatement
  }
}
