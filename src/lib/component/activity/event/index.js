//dom事件
import {
    conversionEventType,
    bindEvents as bindContentEvents
}
from './event'

//音频
import { audioPlayer } from '../../audio/audio'


export default function(activitProto) {

    /**
     * 构建事件体系
     * @return {[type]} [description]
     */
    activitProto.fillEventData = function() {

        //配置事件节点
        var eventId,
            pid,
            contentName,
            //事件上下文对象
            eventContext,
            eventData = this.eventData;

        pid = this.pid

        //如果存在imageIds才处理,单独绑定事件处理
        if (eventId = eventData.eventContentId) {

            //dom
            //找到对应绑定事件的元素
            var domEvent = function() {
                contentName = this.makePrefix('Content', pid, this.id)
                eventData.type = 'dom';
                eventData.canvasMode = false;
                eventData.domMode = true;
            }

            //canvas模式非常特别
            //canvas容器+内部pixi对象
            //所以事件绑定在最外面
            var canvasEvent = function() {
                contentName = this.makePrefix('canvas', pid, this.id)
                eventData.type = 'canvas';
                eventData.canvasMode = true;
                eventData.domMode = false;
            }

            //canvas事件
            if (-1 !== this.canvasRelated.cid.indexOf(eventId)) {
                canvasEvent.call(this)
            } else {
                //dom事件
                domEvent.call(this)
            }

            eventContext = this.getContextNode(contentName)
            eventData.eventContext = eventContext;


            if (eventContext) {
                /**
                 * 绑定事件加入到content钩子
                 */
                this.relatedCallback.contentsHooks(pid, eventId, {
                    $contentProcess: eventContext,
                    //增加外部判断
                    isBindEventHooks: true,
                    type: eventData.type
                })
            } else {
                /**
                 * 针对动态事件处理
                 * 快捷方式引用到父对象
                 * @type {[type]}
                 */
                eventData.parent = this;
            }
        }

        /**
         * 解析出事件类型
         */
        eventData.eventName = conversionEventType(eventData.eventType);
    }


    /**
     * 绑定事件行为
     * @return {[type]} [description]
     */
    activitProto.bindEventBehavior = function(callback) {
        var self = this,
            eventData = this.eventData,
            eventName = eventData.eventName,
            eventContext = eventData.eventContext;

        /**
         * 运行动画
         * @return {[type]} [description]
         */
        var startRunAnim = function() {
            //当前事件对象没有动画的时候才能触发关联动作
            var animOffset,
                boundary = 5; //边界值

            if (eventData.domMode && (animOffset = eventContext.prop('animOffset'))) {
                var originalLeft = animOffset.left;
                var originalTop = animOffset.top;
                var newOffset = eventContext.offset();
                var newLeft = newOffset.left;
                var newTop = newOffset.top;
                //在合理的动画范围是允许点击的
                //比如对象只是一个小范围的内的改变
                //正负10px的移动是允许接受的
                if (originalLeft > (newLeft - boundary) && originalLeft < (newLeft + boundary) || originalTop > (newTop - boundary) && originalTop < (newTop + boundary)) {
                    self.runEffects();
                }
            } else {
                self.runEffects();
            }
        }

        /**
         * 设置按钮的行为
         * 音频
         * 反弹
         */
        var setBehavior = function(feedbackBehavior) {

            var behaviorSound;
            //音频地址
            if (behaviorSound = feedbackBehavior.behaviorSound) {

                var createAuido = function() {
                        return new audioPlayer({
                            url: behaviorSound,
                            trackId: 9999,
                            complete: function() {
                                this.play()
                            }
                        })
                    }
                    //妙妙学客户端强制删除
                if (window.MMXCONFIG && window.audioHandler) {
                    self._fixAudio.push(createAuido())
                } else {
                    createAuido();
                }
            }
            //反弹效果
            if (feedbackBehavior.isButton) {
                //div通过css实现反弹
                if (eventData.domMode) {
                    eventContext.addClass('xut-behavior');
                    setTimeout(function() {
                        eventContext.removeClass('xut-behavior');
                        startRunAnim();
                    }, 500)
                } else {
                    console.log('feedbackBehavior')
                }
            } else {
                startRunAnim();
            }
        }

        /**
         * 事件引用钩子
         * 用户注册与执行
         * @type {Object}
         */
        var eventDrop = {
            //保存引用,方便直接销毁
            init: function(drag) {
                eventData.dragDrop = drag;
            },
            //拖拽开始的处理
            startRun: function() {

            },
            //拖拽结束的处理
            stopRun: function(isEnter) {
                if (isEnter) { //为true表示拖拽进入目标对象区域
                    self.runEffects();
                }
            }
        }

        /**
         * 正常动画执行
         * 除去拖动拖住外的所有事件
         * 点击,双击,滑动等等....
         * @return {[type]} [description]
         */
        var eventRun = function() {
            //如果存在反馈动作
            //优先于动画执行
            var feedbackBehavior;
            if (feedbackBehavior = eventData.feedbackBehavior[eventData.eventContentId]) {
                setBehavior(feedbackBehavior)
            } else {
                startRunAnim();
            }
        }


        /**
         * 事件对象引用
         * @return {[type]} [description]
         */
        var eventHandler = function(eventReference, eventHandler) {
            eventData.eventReference = eventReference;
            eventData.eventHandler = eventHandler;
        }


        //绑定用户自定义事件
        if (eventContext && eventName) {

            var domName,
                target,
                dragdropPara;

            dragdropPara = eventData.dragdropPara;

            //获取拖拽目标对象
            if (eventName === 'dragTag') {
                domName = this.makePrefix('Content', this.pid, dragdropPara);
                target = this.getContextNode(domName);
            }

            //增加事件绑定标示
            //针对动态加载节点事件的行为过滤
            eventData.isBind = true;


            bindContentEvents({
                'eventDrop': eventDrop,
                'eventRun': eventRun,
                'eventHandler': eventHandler,
                'eventContext': eventContext,
                'eventName': eventName,
                'parameter': dragdropPara,
                'target': target,
                'domMode': eventData.domMode
            })
        }
    }

}
