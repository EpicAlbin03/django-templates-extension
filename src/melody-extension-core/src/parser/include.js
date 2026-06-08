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
import { Types, createNode, setEndFromToken, setStartFromToken } from '../../../melody-parser/src/'
import { copyEnd } from '../../../melody-parser/src/util'
import { IncludeStatement } from './../types'


export const IncludeParser = {
  name: 'include',
  parse(parser, token) {
    const tokens = parser.tokens

    const includeStatement = new IncludeStatement(parser.matchExpression())

    if (tokens.nextIf(Types.SYMBOL, 'ignore')) {
      tokens.expect(Types.SYMBOL, 'missing')
      includeStatement.ignoreMissing = true
    }

    if (tokens.nextIf(Types.SYMBOL, 'with')) {
      let args = []
      while (!tokens.test(Types.EOF) && !tokens.test(Types.TAG_END)) {
        if (tokens.test(Types.SYMBOL) && tokens.lat(1) === Types.ASSIGNMENT) {
          const name = tokens.next()
          tokens.next()
          const value = parser.matchExpression()
          const arg = new n.NamedArgumentExpression(createNode(n.Identifier, name, name.text), value)
          copyEnd(arg, value)
          args.push(arg)
        } else if (tokens.test(Types.SYMBOL, 'only')) {
          includeStatement.contextFree = true
          tokens.next()
          break
        } else {
          // args.push(parser.matchExpression())
          const unexpectedToken = tokens.next()
          parser.error({
            title: 'include arguments mismatch',
            pos: unexpectedToken.pos,
            advice: 'eg: {% include "/path/file.dj" with alpha=1 beta=2 %}'
          })
        }
      }
      if (args.length == 0) {
        const unexpectedToken = tokens.next()
        parser.error({
          title: 'include arguments mismatch',
          pos: unexpectedToken.pos,
          advice: 'eg: {% include "/path/file.dj" with alpha=1 beta=2 %}'
        })
      }
      includeStatement.argument = args
    } else if (tokens.nextIf(Types.SYMBOL, 'only')) {
      includeStatement.contextFree = true
    }

    setStartFromToken(includeStatement, token)
    setEndFromToken(includeStatement, tokens.expect(Types.TAG_END))

    return includeStatement
  }
}
