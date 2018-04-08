import { TaskCapsule, ParallelQueue } from 'async-task-manager'

import { postBalances } from '../apis/phpApis'
import { connect } from '../framework/web3'

async function getListAccounts() {
  console.log('获取账户列表')
  let [listAccounts, code, msg] = [[], 200, '']
  try {
    code = 200
    listAccounts = await connect.eth.getAccounts()
  } catch (error) {
    code = -1
    msg = error.toString()
  }
  return {
    code,
    listAccounts,
    msg,
  }
}

async function getBalance(address) {
  let [user, code, msg, amount] = [{}, 200, '', '']
  try {
    code = 200
    amount = await connect.eth.getBalance(address)
    amount = connect.eth.extend.utils.fromWei(amount, 'ether')
    user = { address, amount }
  } catch (error) {
    code = -1
    msg = error.toString()
  }
  return {
    code,
    user,
    msg,
  }
}

async function run() {
  let result = await getListAccounts()
  console.log(`成功获取地址列表：${JSON.stringify(result, null, 4)}`)
  let list = result.listAccounts
  let balanceArr = []
  let total = 0

  const taskQueue = new ParallelQueue({
    onFinished: () => {
      console.log(`查询成功的地址数量${balanceArr.length}`)
      console.log(`总币量${total}`)
      postBalances(balanceArr)
        .then((res) => {
          console.log(`钱包信息查询完毕，提交到 php 服务器: ${JSON.stringify(res, null, 4)}`)
        })
        .catch((err) => {
          console.log(`定时任务队列执行错误: ${err.message}`)
        })
    },
  })

  if (list.length > 0) {
    for (let i = 0; i < list.length; i += 1) {
      taskQueue.add(
        new TaskCapsule(() =>
          new Promise((resolve, reject) =>
            getBalance(list[i])
              .then((res) => {
                total += +res.user.amount
                balanceArr.push(res.user)
                resolve('succ')
              })
              .catch(reject))
        )
      )
    }

    taskQueue.consume()

    return true
  } else {
    throw new Error('地址数组为空')
  }
}

export default run
