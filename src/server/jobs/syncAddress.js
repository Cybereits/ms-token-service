import { TaskCapsule, ParallelQueue } from '@cybereits/ccl/asyncQueue'

import { postBalances } from '../../apis/phpApis'
import { getAllAccounts } from '../../core/scenes/account'
import { getEthBalance } from '../../core/scenes/token'

export default async function () {
  const Accounts = await getAllAccounts()
  let balanceArr = []
  let total = 0

  const taskQueue = new ParallelQueue({
    onFinished: () => {
      console.log(`查询成功的地址数量${balanceArr.length}`)
      console.log(`总币量${total}`)
      postBalances(balanceArr)
        .then((res) => {
          console.log('钱包信息查询完毕，提交到 php 服务器')
        })
        .catch(() => {
          console.error('同步钱包地址任务队列执行错误')
        })
    },
  })

  if (Accounts.length > 0) {
    for (let i = 0; i < Accounts.length; i += 1) {
      taskQueue.add(
        new TaskCapsule(() =>
          new Promise(async (resolve) => {
            let address = Accounts[i]
            let amount = await getEthBalance(address)
            total += +amount
            balanceArr.push({
              address,
              amount,
            })
            resolve('succ')
          })
        )
      )
    }

    taskQueue.consume()
  } else {
    throw new Error('地址数组为空')
  }
}
