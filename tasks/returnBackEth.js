import Input from 'prompt-input'
import Checkbox from 'prompt-checkbox'

import web3 from '../framework/web3'
import { deployOwnerAddr, deployOwnerSecret } from '../config/const'

import { getReturnBackInfo, submitReturnBackSendResult } from '../apis/phpApis'

// 已发送过的地址
let sentAddresses = []
let sentTransactions = []
let connect
let walletAddress
let walletSecret
let transInfo
let trans
let statistics = {
  total: 0,
  succ: 0,
}

let sendWalletPrompt = new Input({
  name: 'wallet address',
  message: 'Enter your eth wallet address [DEFAULT]',
})

let sendWalletPwdPrompt = new Input({
  name: 'wallet secret',
  message: 'Enter your wallet secret [DEFAULT]',
})

const logResult = () => {
  console.info(`[Run statistics]\ntotal:${statistics.total} succ:${statistics.succ}`)
  console.info(`Transactions sent:
------------------------
${sentTransactions.join('\n')}
------------------------  
`)
}

const errorHandler = (err) => {
  console.error(err)
  logResult()
  process.exit(-1)
}

const init = async () => {

  transInfo = await getReturnBackInfo()
    .catch((err) => {
      console.log(err)
      process.exit(-1)
    })

  transInfo = transInfo.filter(t => sentAddresses.indexOf(t.reg_address) === -1)

  let transCheckPrompt = new Checkbox({
    name: 'transactions',
    message: 'Choose the transactions wanna send [Space to check, Enter to confirm]',
    choices: transInfo.map(({ name, reg_address, return_amount }) => `User:${name}\tAddress:${reg_address}\tAmount:${return_amount}`),
  })

  walletAddress = await sendWalletPrompt.run()
    .catch(errorHandler)

  walletSecret = await sendWalletPwdPrompt.run()
    .catch(errorHandler)

  trans = await transCheckPrompt.run()
    .catch(errorHandler)
}

const main = async () => {

  await init()

  if (trans && trans.length > 0) {
    try {
      trans = trans.map((transTerm) => {
        let match = transInfo.filter(({ reg_address }) => transTerm.indexOf(reg_address) > -1)[0]
        if (match) {
          return {
            address: match.reg_address,
            amount: (+match.return_amount).toFixed(2),
          }
        } else {
          throw new Error(`Can't find the matched entity with chosen term ${transTerm}`)
        }
      })

    } catch (ex) {
      errorHandler(ex)
    }

    walletAddress = (walletAddress && walletAddress.trim()) || deployOwnerAddr
    walletSecret = (walletSecret && walletSecret.trim()) || deployOwnerSecret

    // console.log(trans)

    let confirm = new Input({
      name: 'confirm',
      message: `Confirm [Y to confirm, other to cancel]
From Address: ${walletAddress}
Total Transactions: ${trans.length}
-------------------------
${trans.map(({ address, amount }) => `  to：${address}\tamount: ${amount}`).join('\n')}`,
    })

    let confirmEnter = await confirm.run()
      .catch(errorHandler)

    if (confirmEnter && confirmEnter.toLowerCase() === 'y') {
      statistics.total += trans.length

      let succCollection = []
      let continueConfirm = new Input({
        name: 'continue',
        message: `Synchronous sent result success!
Successed Transactions:
--------------------------------------------------------------------------------------------
address\t\t\t\t\t\t|amount\t|txid
--------------------------------------------------------------------------------------------
${succCollection.map(({ address, amount, txid }) => `${address}\t${amount}\t${txid}`).join('\n')}
--------------------------------------------------------------------------------------------
Continue? [Y to confirm, other to cancel]`,
      })

      let submitResult = () => {
        if (trans.length > succCollection.length) {
          console.warn(`共执行${trans.length}笔转账,成功发出的只有${succCollection.length}笔,请手动核实!`)
        }
        console.log('提交发送结果...')
        submitReturnBackSendResult(succCollection)
          .then(async () => {
            let continueResult = await continueConfirm
              .run()
              .catch(errorHandler)

            if (continueResult && continueResult.toLowerCase() === 'y') {
              main()
            } else {
              logResult()
              process.exit(0)
            }

          })
          .catch(errorHandler)
      }

      let proms = trans.map(({ address, amount }) =>
        new Promise((resolve, reject) => {
          console.log(`Send begin! to:${address} amount:${amount}`)
          sentAddresses.push(address)
          connect
            .eth
            .personal
            .sendTransaction({
              from: walletAddress,
              to: address,
              value: connect.eth.extend.utils.toWei(amount, 'ether'),
            }, walletSecret)
            .then((txid) => {
              console.log(`Send successed! to:${address} amount:${+(+amount).toFixed(2)} txid:${txid}`)
              succCollection.push({
                address,
                amount,
                txid,
              })
              sentTransactions.push(txid)
              statistics.succ += 1
              resolve()
            })
            .catch((err) => {
              reject(err)
            })
        }))

      Promise
        .all(proms)
        .then(submitResult)
        .catch((err) => {
          console.error(err)
          submitResult()
        })
    } else {
      console.warn('Transactions canceled, application exit...')
      logResult()
      process.exit(0)
    }
  } else {
    console.warn('Didn\'t choose any address, application exit...')
    logResult()
    process.exit(0)
  }
}

export default async () => {
  connect = await web3.onWs
  main()
}
