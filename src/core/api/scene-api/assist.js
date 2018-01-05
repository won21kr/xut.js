/********************************************
 * 场景API
 * 辅助对象
 ********************************************/

import { getPostMessageFn } from '../post-message'

export function extendAssist(access, $$globalSwiper) {

  //========================
  //  翻页的通知api
  //========================

  /**
   * 允许翻页
   */
  //最大的翻页索引标记
  //这个是顺序
  let maxFlipIndex = 0
  Xut.Assist.EnableFlip = function() {
    let pageIndex = Xut.Presentation.GetPageIndex()
    if (pageIndex > maxFlipIndex) {
      maxFlipIndex = pageIndex
      Xut.Application.Notify('enableFlip', maxFlipIndex)
    }
  }


  //========================
  //  秒秒学嵌套Iframe 讨论区
  //========================

  /**
   * 标记讨论区状态
   * @type {Boolean}
   */
  let forumStatus = false

  /**
   * 设置讨论区
   * @param {Function} fn    [description]
   * @param {[type]}   state [description]
   */
  function setForum(callback, fn, state) {
    //互斥可以相互关闭
    //并且排除重复调用
    if (fn && forumStatus !== state) {
      //从1开始算
      fn({ pageIndex: Xut.Presentation.GetPageIndex() + 1 })
      //标记状态，提供关闭
      forumStatus = state
      callback && callback()
    }
  }

  /**
   * 针对秒秒学的api
   * 打开讨论区
   */
  Xut.Assist.GlobalForumOpen = (callback) => setForum(callback, getPostMessageFn('forumOpen'), true)

  /**
   * 针对秒秒学的api
   * 关闭讨论区
   */
  Xut.Assist.GlobalForumClose = (callback) => setForum(callback, getPostMessageFn('forumClose'), false)


  /**
   * 发送圆点状态请求
   * type
   *   forumDot
   *   commitWorkDot
   */
  Xut.Assist.RequestDot = function(type, pageIndex) {
    const fn = getPostMessageFn(type)
    if (fn) {
      fn({ pageIndex })
    }
  }

  /**
   * 讨论区切换
   * @param {[type]} options.open  [description]
   * @param {[type]} options.close [description]
   */
  Xut.Assist.GlobalForumToggle = function({
    open,
    close
  } = {}) {
    if (forumStatus) {
      Xut.Assist.GlobalForumClose(close)
    } else {
      Xut.Assist.GlobalForumOpen(open)
    }
  }


  //===============================
  //  秒秒学嵌套Iframe 全局工具栏目录
  //===============================

  let globalDirStatus = false

  function setBarDir(callback, fn, state) {
    if (fn && globalDirStatus !== state) {
      //从1开始算
      fn()
      globalDirStatus = state
      callback && callback()
    }
  }

  /**
   * 打开全局工具栏目录
   * @return {[type]} [description]
   */
  Xut.Assist.GlobalDirOpen = (callback) => setBarDir(callback, getPostMessageFn('dirOpen'), true)

  /**
   * 关闭全局工具栏目录
   * @return {[type]} [description]
   */
  Xut.Assist.GlobalDirClose = (callback) => setBarDir(callback, getPostMessageFn('dirClose'), false)

  /**
   * 自动切换
   */
  Xut.Assist.GlobalDirToggle = function({
    open,
    close
  } = {}) {
    if (globalDirStatus) {
      Xut.Assist.GlobalDirClose(close)
    } else {
      Xut.Assist.GlobalDirOpen(open)
    }
  }


  //==========================
  //  秒秒学嵌套Iframe 继续学习
  //==========================
  Xut.Assist.GlobalKeepLearn = function() {
    const fn = getPostMessageFn('keepLearn')
    if (fn) {
      fn()
    }
  }


  //==========================
  //  秒秒学嵌套Iframe 提交作业
  //==========================
  Xut.Assist.GlobalCommitWork = function() {
    const fn = getPostMessageFn('commitWork')
    if (fn) {
      fn()
    }
  }

  //========================
  // 秒秒学嵌套Iframe  答题卡
  //========================

  /**
   * 设置答题卡的正确错误率
   */
  function setAnswer(event) {
    console.log(event)
  }

  /**
   * 秒秒学答题卡
   * 正确性
   */
  Xut.Assist.AnswerRight = () => setAnswer('right')

  /**
   * 秒秒学答题卡
   * 错误性
   */
  Xut.Assist.AnswerError = () => setAnswer('error')


  //========================
  //  音频类
  //========================

  /**
   * 是否存在插件
   * @return {Boolean} [description]
   */
  function isExistRecord(callback) {
    if (window.cordova && Xut.Plugin.Recorder) {
      callback()
    }
  }

  /**
   * 开始录音
   */
  let recordState = false
  Xut.Assist.RecordStart = function(id, time) {
    if (!id) {
      Xut.$warn({
        type: 'record',
        content: `没有传递录音的编号id:${id}`
      })
      return
    }
    Xut.$warn({
      type: 'record',
      content: `开始录音,id:${id},time:${time}`
    })
    isExistRecord(function() {
      Xut.Assist.RecordStop()
      recordState = true
      Xut.Plugin.Recorder.startRecord(id, time, function() {
        recordState = false
        Xut.$warn({
          type: 'record',
          content: `录音完成,id:${id}`
        })
      })
    })
  }

  /**
   * 停止录音
   * @param {[type]} id   [description]
   * @param {[type]} time [description]
   */
  Xut.Assist.RecordStop = function() {
    if (recordState && window.cordova && Xut.Plugin.Recorder) {
      Xut.$warn({
        type: 'record',
        content: `录音停止`
      })
      recordState = false
      Xut.Plugin.Recorder.stopRecord()
    }
  }

  /**
   * 播放录音
   */
  Xut.Assist.RecordPlay = function(id) {
    if (!id) {
      Xut.$warn({
        type: 'record',
        content: `没有传递播放录音的编号id:${id}`
      })
      return
    }
    Xut.$warn({
      type: 'record',
      content: `播放录音,id:${id}`
    })
    isExistRecord(function() {
      Xut.Plugin.Recorder.startPlay(id)
    })
  }

  /**
   * 播放停止
   * @param {[type]} id [description]
   */
  Xut.Assist.RecordPlayStop = function(id) {
    if (!id) {
      Xut.$warn({
        type: 'record',
        content: `没有传递停止播放录音的编号id:${id}`
      })
      return
    }
    isExistRecord(function() {
      Xut.$warn({
        type: 'record',
        content: `播放录音停止,id:${id}`
      })
      Xut.Plugin.Recorder.stopPlay(id)
    })
  }


  //========================
  //  其他
  //========================

  /**
   * 滤镜渐变动画
   * content id
   * 滤镜样式名
   * 1  ".filter-blur-a2"
   * 优先查找page层，后查找master层
   */
  Xut.Assist.FilterGradient = function(contentId, filterClassName) {
    if (contentId && filterClassName) {
      let contentObj = Xut.Contents.Get('page', contentId)
      if (!contentObj) {
        contentObj = Xut.Contents.Get('master', contentId)
        if (contentObj) return
      }
      if (filterClassName.length) {
        filterClassName = filterClassName.join(' ')
      }
      contentObj.$contentNode.addClass(filterClassName)
    }
  }


  /**
   * 针对HOT的显示与隐藏
   * @param {[type]} activityId    [activity中的Id]
   * @param {[type]} start         [显示与隐藏]
   *     Xut.Assist.TriggerPoint(activityId, 'show')
         Xut.Assist.TriggerPoint(activityId, 'hide')
   */
  Xut.Assist.TriggerPoint = function(activityId, state) {
    const data = Xut.data.query('Activity', activityId);
    if (data) {
      const $dom = $(`#${data.actType}_${data._id}`)
      if ($dom.length) {
        if (state === 'show') {
          Xut.nextTick(() => {
            $dom.css('visibility', 'visible')
          })
        }
        if (state === 'hide') {
          $dom.css('visibility', 'hidden')
        }
      }
    }
  }

  /**
   * 文字动画
   * @param {[type]} contentId [description]
   */
  Xut.Assist.TextFx = function(contentId) {
    const pageObj = Xut.Presentation.GetPageBase()
    const fxObj = pageObj.getLetterObjs(contentId)
    if (fxObj) {
      fxObj.play()
    }
  }

  /**
   * 辅助对象的控制接口
   * 运行辅助动画
   * 辅助对象的activityId,或者合集activityId
   * Run
   * stop
   * 1 零件
   * 2 音频动画
   */
  _.each([
    "Run",
    "Stop"
  ], function(apiName) {
    Xut.Assist[apiName] = function(pageType, activityId, outCallBack) {
      access(function(manager, pageType, activityId, outCallBack) {
        //数组
        if (_.isArray(activityId)) {
          //完成通知
          var markComplete = function() {
            var completeStatistics = activityId.length; //动画完成统计
            return function() {
              if (completeStatistics === 1) {
                outCallBack && outCallBack();
                markComplete = null;
              }
              completeStatistics--;
            }
          }();
          _.each(activityId, function(id) {
            manager.assistAppoint(id, $$globalSwiper.getVisualIndex(), markComplete, apiName);
          })
        } else {
          manager.assistAppoint(activityId, $$globalSwiper.getVisualIndex(), outCallBack, apiName);
        }
      }, pageType, activityId, outCallBack)
    }
  })


}
