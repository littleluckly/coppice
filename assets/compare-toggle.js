/**
 * compare-toggle — 商品卡"Add to compare"按钮的最小行为。
 *
 * v1.0 范围（task-index T-1.2）：点击切换 aria-pressed，供无障碍与视觉状态。
 * 完整对比逻辑（跨组校验、localStorage `ib:compare:v1`、对比栏）由对比页任务实现，
 * 届时消费按钮上的 data-compare-group / data-compare-handle / data-compare-title。
 */
document.addEventListener('click', function (event) {
  var button = event.target.closest('.product-card__compare');
  if (!button) return;

  var pressed = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', pressed ? 'false' : 'true');
});
