import { config } from '../../../config/index'

/**
 *  对外接口
 *  1 开始调用任务
 *  2 调用自动运行任务
 *  3 设置中断
 *  4 取消中断设置
 */

export default function(baseProto) {

  /**
   * 开始调用任务
   * dispatch=>index=>create=>startThreadTask
   * @return {[type]} [description]
   */
  baseProto.startThreadTask = function(isFlipAction, callback, isToPageAction) {

    this.isToPageAction = isToPageAction

    /*
    构建container任务完成后的一次调用
    用于处理快速翻页
     */
    this.createRelated.preforkComplete = (() => {
      return() => {
        /*当创建完容器后，就允许快速翻页了
        如果此时是快速打开，并且是翻页的动作*/
        if(config.quickFlip && isFlipAction) {
          callback()
        } else {
          /*如果不是快速翻页，那么就继续往下分解任务*/
          this._checkNextTaskCreate(callback)
        }
      }
    })()

    //继续构建任务
    this.dispatchTasks()
  }


  /**
   * 任务调度
   * @return {[type]} [description]
   */
  baseProto.dispatchTasks = function() {
    const threadtasks = this.threadtasks[this.createRelated.nextRunTask]
    if(threadtasks) {
      threadtasks()
    }
  }

  /**
   * 处理最后一页动作
   * [destroyPageAction description]
   * @return {[type]} [description]
   */
  baseProto.destroyPageAction = function() {
    if(this.stopLastPageAction) {
      this.stopLastPageAction()
      this.stopLastPageAction = null
    }
  }

  /**
   * 创建最后一次页面动作
   * @return {[type]} [description]
   */
  baseProto.createPageAction = function() {
    //如果有最后一个动作触发
    //2016.10.13 给妙妙学增加watch('complete')
    if(this.runLastPageAction) {
      //返回停止方法
      this.stopLastPageAction = this.runLastPageAction()
    }
  }

  /**
   * 检测任务是否完成
   * page => autoRun中需要保证任务完成后才能执行
   * 快速翻页中遇到
   * actTasksCallback 活动任务完成
   * @return {[type]} [description]
   */
  baseProto.checkThreadTask = function(actTasksCallback) {
    this.hasAutoRun = true;
    this._checkNextTaskCreate(() => {
      this.hasAutoRun = false
      actTasksCallback()
    })
  }


  /**
   * 开始执行下一个线程任务,检测是否中断
   * outSuspendTasks,
   * outNextTasks
   * taskName
   * @return {[type]} [description]
   */
  baseProto.nextTasks = function(callback) {
    this._asyTasks({
      suspendCallback() {
        callback.outSuspendTasks && callback.outSuspendTasks()
      },
      nextTaskCallback() {
        callback.outNextTasks && callback.outNextTasks()
      }
    }, callback.interrupt)
  }


  /**
   * 设置任务中断
   */
  baseProto.setTaskSuspend = function() {
    this.hasAutoRun = false;
    this.canvasRelated.isTaskSuspend = true;
    this.createRelated.preCreateTasks = false;
    this.createRelated.tasksHang = null;
  }


  /**
   * 后台预创建任务
   * @param  {[type]} tasksTimer [时间间隔]
   * @return {[type]}            [description]
   */
  baseProto.createPreforkTasks = function(callback, isPreCreate) {
    var self = this;
    //2个预创建间隔太短
    //背景预创建还在进行中，先挂起来等待
    if(this.createRelated.preCreateTasks) {
      this.createRelated.tasksHang = function(callback) {
        return function() {
          self._checkNextTaskCreate(callback);
        }
      }(callback);
      return;
    }

    /**
     * 翻页完毕后
     * 预创建背景
     */
    if(isPreCreate) {
      this.createRelated.preCreateTasks = true;
    }

    this._checkNextTaskCreate(callback);
  }


  /**
   * 自动运行：检测是否需要开始创建任务
   * 1 如果任务全部完成了毕
   * 2 如果有中断任务,就需要继续创建未完成的任务
   * 3 如果任务未中断,还在继续创建
   * currtask 是否为当前任务，加速创建
   */
  baseProto._checkNextTaskCreate = function(callback) {

    //如果任务全部完成
    if(this.createRelated.nextRunTask === 'complete') {
      return callback()
    }

    const self = this

    //开始构未完成的任务
    this._cancelTaskSuspend()

    //完毕回调
    this.createRelated.createTasksComplete = () => {
      this.collectHooks && this.collectHooks.threadtaskComplete()
      callback()
    };

    //派发任务
    this.nextTasks({
      outNextTasks() {
        self.dispatchTasks();
      }
    });
  }


  /**
   * 取消任务中断
   * @return {[type]} [description]
   */
  baseProto._cancelTaskSuspend = function() {
    this.canvasRelated.isTaskSuspend = false
  }


  /**
   * 检测任务是否需要中断
   * @return {[type]} [description]
   */
  baseProto._checkTaskSuspend = function() {
    return this.canvasRelated.isTaskSuspend;
  }


  /**
   * 多线程检测
   * @return {[type]} [description]
   */
  baseProto._multithreadCheck = function(callbacks, interrupt) {

    const check = () => {
      if(this._checkTaskSuspend()) {
        this.tasksTimeOutId && clearTimeout(this.tasksTimeOutId)
        callbacks.suspendCallback.call(this);
      } else {
        callbacks.nextTaskCallback.call(this);
      }
    }

    const next = () => {
      this.tasksTimeOutId = setTimeout(() => {
        check();
      }, this.canvasRelated.tasksTimer);
    }

    //自动运行页面构建
    if(this.hasAutoRun) {
      //自动运行content中断检测 打断一次
      if(interrupt) {
        next();
      } else {
        check();
      }
    } else {
      //后台构建
      next();
    }
  }


  /**
   * 任务队列挂起
   * nextTaskCallback 成功回调
   * suspendCallback  中断回调
   * @return {[type]} [description]
   */
  baseProto._asyTasks = function(callbacks, interrupt) {

    //如果关闭多线程,不检测任务调度
    if(!this.hasMultithread) {
      return callbacks.nextTaskCallback.call(this);
    }

    //多线程检测
    this._multithreadCheck(callbacks, interrupt)
  }

}
