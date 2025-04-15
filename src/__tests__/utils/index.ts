import * as $ from 'jquery';
function pinTestResult(result: string | number, testId = 'test-res'): void {
  $(document.body).append(
    `<span id="${testId}" class="test-info">${result}<span>`,
  );
}
export {pinTestResult}