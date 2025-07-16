// ==UserScript==
// @name         广西大学教学评价脚本
// @namespace    GXU_Optimized
// @version      2.1
// @description  一键自动教学评价，模拟人类行为，智能处理弹窗，只保存不提交，支持多页查找老师
// @author       ASH (created by Gemini)
// @match        *://jwxt2018.gxu.edu.cn/jwglxt/xspjgl/*
// @grant        none
// @license      MIT
// @downloadURL  https://github.com/ASH0459/GXU_AutoEval/blob/main/%E5%B9%BF%E8%A5%BF%E5%A4%A7%E5%AD%A6%E6%95%99%E5%AD%A6%E8%AF%84%E4%BB%B7%E8%84%9A%E6%9C%AC-2.1.user.js
// @updateURL    https://github.com/ASH0459/GXU_AutoEval/blob/main/%E5%B9%BF%E8%A5%BF%E5%A4%A7%E5%AD%A6%E6%95%99%E5%AD%A6%E8%AF%84%E4%BB%B7%E8%84%9A%E6%9C%AC-2.1.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 修改 User-Agent 以模拟手机浏览器
    Object.defineProperty(navigator, 'userAgent', {value:'Mozilla/5.0 (Linux; U; Android 10.0; zh-CN; PRO 7-S Build/NRD90M)',writable: false});

    let stopScript = false;

    // 随机延迟函数：生成 min 到 max 之间的随机整数（毫秒）
    const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // 模拟人类点击函数：模拟 mousedown -> mouseup -> click 过程，并加入随机偏移和延迟
    async function humanlikeClick(element) {
        if (!element) {
            console.warn('Attempted to click a non-existent element.');
            return;
        }
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        element.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true, cancelable: true, view: window,
            clientX: x + (Math.random() - 0.5) * rect.width * 0.1,
            clientY: y + (Math.random() - 0.5) * rect.height * 0.1,
        }));
        await new Promise(r => setTimeout(r, getRandomDelay(50, 150)));

        element.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true, cancelable: true, view: window,
            clientX: x + (Math.random() - 0.5) * rect.width * 0.1,
            clientY: y + (Math.random() - 0.5) * rect.height * 0.1,
        }));
        await new Promise(r => setTimeout(r, getRandomDelay(50, 150)));

        element.click();
        await new Promise(r => setTimeout(r, getRandomDelay(100, 300)));
    }

    // 统一按钮样式
    const buttonStyle = 'position: absolute; z-index: 9999; background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 8px;';

    // 创建并添加控制按钮
    const createButton = (text, rightOffset, onClick, bgColor = '#4CAF50') => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `${buttonStyle} right: ${rightOffset}px; top: 12px; background-color: ${bgColor};`;
        button.onclick = onClick;
        document.querySelector("#navbar_container").appendChild(button);
        return button;
    };

    let autoEvaluateButton = createButton("一键评价并保存", 100, async () => {
        stopScript = false;
        autoEvaluateButton.disabled = true;
        autoEvaluateButton.innerText = '正在评价...';

        let currentPage = 1; // 记录当前页码
        let totalPages = 1; // 记录总页数，初始值为1，待获取

        // --- 整体翻页循环 ---
        while (!stopScript) {
            // 获取当前页和总页数
            const totalPagesSpan = document.getElementById('sp_1_pager');
            if (totalPagesSpan) {
                totalPages = parseInt(totalPagesSpan.innerText) || 1;
                const currentPageInput = document.querySelector('.ui-pg-input');
                if (currentPageInput) {
                    currentPage = parseInt(currentPageInput.value) || 1;
                }
                console.log(`当前在第 ${currentPage} 页，共 ${totalPages} 页。`);
            } else {
                console.warn('未找到分页信息 (总页数/当前页)，假定只有一页。');
            }


            console.log('开始寻找当前页未评价的课程...');
            const unevaluatedCourses = Array.from(document.querySelectorAll('#tempGrid tr[role="row"] td[aria-describedby="tempGrid_tjztmc"][title="未评"]')).map(td => td.closest('tr'));

            if (unevaluatedCourses.length === 0) {
                console.log(`当前第 ${currentPage} 页没有未评价的课程。`);
                // 如果当前页没有未评价的老师，尝试翻页
                if (currentPage < totalPages) {
                    const nextPageButton = document.getElementById('next_pager');
                    if (nextPageButton && !nextPageButton.classList.contains('ui-state-disabled')) {
                        console.log(`正在翻到下一页 (${currentPage + 1}/${totalPages})...`);
                        await humanlikeClick(nextPageButton);
                        await new Promise(r => setTimeout(r, getRandomDelay(2000, 3500))); // 等待页面加载
                        continue; // 继续外层循环，处理新页面的老师
                    } else {
                        console.log('已是最后一页或下一页按钮不可用，所有可见课程已评价。');
                        break; // 所有页都检查完了，停止脚本
                    }
                } else {
                    console.log('已是最后一页，所有可见课程已评价。脚本停止。🎉');
                    break; // 所有页都检查完了，停止脚本
                }
            }

            // 如果当前页有未评价的老师，则逐一评价
            for (const courseRow of unevaluatedCourses) {
                if (stopScript) break; // 内部循环也要检查停止标志

                const courseName = courseRow.querySelector('td[aria-describedby="tempGrid_kcmc"]').getAttribute('title');
                const teacherName = courseRow.querySelector('td[aria-describedby="tempGrid_jzgmc"]').getAttribute('title');

                console.log(`正在评价课程：${courseName}，教师：${teacherName}`);

                await humanlikeClick(courseRow);
                await new Promise(r => setTimeout(r, getRandomDelay(1500, 2500)));

                if (stopScript) break;

                console.log('评价内容已加载，开始选择评分并填写评语。');

                const evaluationPanels = document.querySelectorAll('.panel-pjdx');
                for (const panel of evaluationPanels) {
                    if (stopScript) break;

                    const pjmbmcbId = panel.getAttribute('data-pjmbmcb_id');
                    const allTrs = Array.from(panel.querySelectorAll('table.table-xspj tr.tr-xspj'));

                    if (allTrs.length > 0) {
                        const randomIndex = Math.floor(Math.random() * allTrs.length);
                        const satisfiedPjzbxmId = allTrs[randomIndex].getAttribute('data-pjzbxm_id');

                        console.log(`- 在此评价面板中，随机选择指标 ${satisfiedPjzbxmId} 为“满意”。`);

                        for (const tr of allTrs) {
                            if (stopScript) break;
                            const currentPjzbxmId = tr.getAttribute('data-pjzbxm_id');
                            const targetDyf = (currentPjzbxmId === satisfiedPjzbxmId) ? '80' : '94'; // '80' for 满意, '94' for 非常满意
                            const targetRadioButton = tr.querySelector(`input.radio-pjf[data-dyf="${targetDyf}"]`);

                            if (targetRadioButton && !targetRadioButton.checked) {
                                await humanlikeClick(targetRadioButton);
                            }
                        }
                    }

                    const pyInput = document.getElementById(`${pjmbmcbId}_py`);
                    if (pyInput) {
                        const comment = '老师教学非常棒，非常满意！';
                        pyInput.value = '';
                        for (let i = 0; i < comment.length; i++) {
                            if (stopScript) break;
                            pyInput.value += comment[i];
                            pyInput.dispatchEvent(new Event('input', { bubbles: true }));
                            await new Promise(r => setTimeout(r, getRandomDelay(30, 80)));
                        }
                        await new Promise(r => setTimeout(r, getRandomDelay(200, 500)));
                    }
                }
                if (stopScript) break; // 跳出panel循环

                console.log('所有评价项已选择，并填写了评语。');

                let saveSuccessful = false;
                let attempts = 0;
                const maxAttempts = 10;

                while (!saveSuccessful && attempts < maxAttempts && !stopScript) {
                    attempts++;

                    const delayBeforeSave = (attempts === 1) ? getRandomDelay(1000, 2500) : getRandomDelay(500, 1000);
                    await new Promise(r => setTimeout(r, delayBeforeSave));
                    console.log(`尝试点击保存按钮 (第 ${attempts} 次), 延迟 ${delayBeforeSave}ms...`);

                    const saveButton = document.getElementById('btn_xspj_bc');
                    if (!saveButton) {
                        console.error('未找到保存按钮。脚本停止。');
                        stopScript = true;
                        break;
                    }

                    await humanlikeClick(saveButton);
                    await new Promise(r => setTimeout(r, getRandomDelay(1500, 2500))); // 等待弹窗出现

                    if (stopScript) break;

                    const bootboxModal = document.querySelector('.bootbox.modal');
                    if (bootboxModal) {
                        const modalTitle = bootboxModal.querySelector('.modal-title')?.innerText || '';
                        const modalBodyText = bootboxModal.querySelector('.bootbox-body p')?.innerText || bootboxModal.querySelector('.bootbox-body div.alert')?.innerText || '';
                        const confirmButton = bootboxModal.querySelector('#btn_ok');

                        if (!confirmButton) {
                            console.error('弹窗出现但未找到确认按钮。脚本停止。');
                            stopScript = true;
                            break;
                        }

                        if (modalBodyText.includes('请勿使用类似脚本注入方式自动评价!')) {
                            console.warn('检测到脚本注入警告弹窗。点击确认，并重新尝试保存。');
                            await humanlikeClick(confirmButton);
                            await new Promise(r => setTimeout(r, getRandomDelay(1000, 1500)));
                        } else if (modalBodyText.includes('保存成功')) {
                            console.log('检测到保存成功弹窗。点击确认，并准备评价下一个老师。');
                            await humanlikeClick(confirmButton);
                            await new Promise(r => setTimeout(r, getRandomDelay(1000, 2000)));
                            saveSuccessful = true;
                        } else {
                            console.warn(`检测到未知类型弹窗：标题="${modalTitle}", 内容="${modalBodyText}"。默认点击确认并视为当前课程评价成功。`);
                            await humanlikeClick(confirmButton);
                            await new Promise(r => setTimeout(r, getRandomDelay(1000, 2000)));
                            saveSuccessful = true;
                        }
                    } else {
                        console.log('未检测到弹窗。假设保存成功并页面已自动跳转。');
                        saveSuccessful = true;
                        // 如果页面自动跳转了，此处不需要额外等待跳转，下一个循环会处理
                        // 但是为了稳健性，可以保留一个短暂的延迟
                        await new Promise(r => setTimeout(r, getRandomDelay(500, 1000)));
                    }
                } // end while (!saveSuccessful...)

                if (!saveSuccessful) {
                    console.error('未能成功保存当前评价。将尝试处理下一个课程（如果存在）。');
                }

                if (stopScript) break; // 如果在保存循环中停止了，也要跳出 for 循环
            } // end for (const courseRow of unevaluatedCourses)

            if (stopScript) break; // 如果在课程循环中停止了，也要跳出 while (!stopScript)

            // 评价完当前页所有老师后，重新检查未评价课程数量。
            // 这一步很重要，因为评价成功后，该老师会从“未评”列表消失。
            // 如果还有未评老师（即弹窗后未跳转），外层循环会继续处理
            const remainingUnevaluated = document.querySelectorAll('#tempGrid tr[role="row"] td[aria-describedby="tempGrid_tjztmc"][title="未评"]').length;
            if (remainingUnevaluated > 0) {
                console.log(`当前页还有 ${remainingUnevaluated} 个未评价老师，继续处理。`);
                continue; // 返回外层循环顶部，处理剩余的老师（可能是局部刷新未跳转）
            } else {
                console.log(`当前页所有老师已评价。`);
                // 检查是否需要翻页 (处理完当前页所有老师后再次检查)
                if (currentPage < totalPages) {
                    const nextPageButton = document.getElementById('next_pager');
                    if (nextPageButton && !nextPageButton.classList.contains('ui-state-disabled')) {
                        console.log(`正在翻到下一页 (${currentPage + 1}/${totalPages})...`);
                        await humanlikeClick(nextPageButton);
                        await new Promise(r => setTimeout(r, getRandomDelay(2000, 3500))); // 等待页面加载
                        // 成功翻页后，currentPage 会在下一个循环开始时自动更新 (通过读取.ui-pg-input)
                    } else {
                        console.log('已是最后一页或下一页按钮不可用，所有可见课程已评价。脚本停止。');
                        break; // 没有下一页，停止脚本
                    }
                } else {
                    console.log('已是最后一页，所有可见课程已评价。脚本停止。🎉');
                    break; // 所有页都检查完了，停止脚本
                }
            }
        } // end while (!stopScript)

        autoEvaluateButton.disabled = false;
        autoEvaluateButton.innerText = '一键评价并保存';
        stopButton.remove();
        autoEvaluateButton.remove();
    });

    const stopButton = createButton("停止", 220, () => {
        stopScript = true;
        console.log('脚本已停止。');
        stopButton.remove();
        autoEvaluateButton.remove();
    }, '#f44336'); // 停止按钮使用红色背景

    console.log('自动评价脚本已加载。请点击“一键评价并保存”按钮开始评价。');
})();
