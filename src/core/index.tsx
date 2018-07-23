import Client from '../sdk'

import * as types from './types'
import transactionsAPI from '../sdk/transactions';

const isProd: boolean = process.env.NODE_ENV === 'production'

export const client = new Client({
  url: 'http://localhost:9888'
})

// Parses an error from Chain Core
export const parseError = (err) => {
  if (err === undefined) {
    return ''
  }

  switch(err.code) {
    case 'CH706': {
      const body = err.body
      if (body === undefined) {
        return err.message
      }

      const data = body.data
      if (data === undefined) {
        return err.message
      }

      const actions = data.actions
      if (actions === undefined || actions.length === 0) {
        return err.message
      }
      return actions[0].message
    }
    case 'CH707': {
      return (
        'The current time fails contract validation. ' +
        'Check arguments to before() and after() function calls.'
      )
    }
    case 'CH735': {
      return 'The transaction failed validation.'
    }
    default:
      return err.message
  }
}

// Prefixes the redux router route during production builds.
export const prefixRoute = (route: string): string => {
  if (isProd) {
    return "/equity" + route
  }
  return route
}

export const createLockingTx = (actions: types.Action[], password: string): Promise<Object> => {
  return client.transactions.build(builder => {
    actions.forEach(action => {
      switch (action.type) {
        case "spendFromAccount":
          builder.spendFromAccount(action)
          break
        case "controlWithProgram":
          builder.controlWithProgram(action)
          break
        default:
          break
      }
    })
  }).then(resp => {
    if (resp.status === 'fail') {
      throw new Error(resp.msg)
    }

    const tpl = resp.data
    const body = Object.assign({}, {'password': password, 'transaction': tpl})
    return client.transactions.sign(body).then(resp => {
      if (resp.status === 'fail') {
        throw new Error(resp.msg)
      }

      const raw_transaction = resp.data.transaction.raw_transaction
      const signTx = Object.assign({}, {'raw_transaction': raw_transaction})
      return client.transactions.submit(signTx).then(resp => {
        if (resp.status === 'fail') {
          throw new Error(resp.msg)
        }

        return {
          transactionId: resp.data.tx_id
        }
      })
    })
  })
}

const multiSign = (transaction, passwords: string[]) => {
  if (passwords.length > 0) {
    const password = passwords[passwords.length - 1]
    const body = {password, transaction}
    return client.transactions.sign(body).then(resp => {
      if (resp.status === 'fail') {
        throw new Error(resp.msg)
      }
      if (resp.data.sign_complete) {
        return resp.data.transaction.raw_transaction
      }
      passwords.pop()
      return multiSign(resp.data.transaction, passwords)
    })
  } else {
    return transaction.data.transaction.raw_transaction
  }
}

// Satisfies created contract and transfers value.
export const createUnlockingTx = (actions: types.Action[], passwords: string[]): Promise<{id: string}> => {
  return Promise.resolve().then(() => {
    return client.transactions.build(builder => {
      actions.forEach(action => {
        switch (action.type) {
          case "spendFromAccount":
            builder.spendFromAccount(action)
            break
          case "controlWithProgram":
            builder.controlWithProgram(action)
            break
          case "spendUnspentOutput":
            builder.spendUnspentOutput(action)
            break
          default:
            break
        }
      })
    })
  }).then(resp => {
    if (resp.status === 'fail') {
      throw new Error(resp.msg)
    }

    const tpl = resp.data
    return multiSign(tpl, passwords).then(raw_tx => {
      const signTx = Object.assign({}, {'raw_transaction': raw_tx})
      return client.transactions.submit(signTx).then(resp => {
        if (resp.status === 'fail') {
          throw new Error(resp.msg)
        }

        return {
          id: resp.data.tx_id
        }
      })
    })

    // const body = Object.assign({}, {'password': password, 'transaction': tpl})
    // return client.transactions.sign(body).then(resp => {
    //   if (resp.status === 'fail') {
    //     throw new Error(resp.msg)
    //   }

    //   const raw_transaction = resp.data.transaction.raw_transaction
    //   const signTx = Object.assign({}, {'raw_transaction': raw_transaction})
    //   return client.transactions.submit(signTx).then(resp => {
    //     if (resp.status === 'fail') {
    //       throw new Error(resp.msg)
    //     }

    //     return {
    //       id: resp.data.tx_id
    //     }
    //   })
    // })
  })
}
