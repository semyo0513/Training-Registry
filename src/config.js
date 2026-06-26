export const config = {
  // 로컬 스토리지에 저장된 Google Apps Script Web App URL 반환 (기본값: 사용자 제공 GAS URL)
  getGasUrl() {
    return localStorage.getItem('everyone_register_gas_url') || 'https://script.google.com/macros/s/AKfycbxaTFa-uBBiw9Li7m389tmIgP1u_-rEZIG1uYFP1qrmYZENEOTbIvzwjk3_zD05Ax52/exec';
  },
  
  // GAS URL 저장 또는 제거
  setGasUrl(url) {
    if (url) {
      localStorage.setItem('everyone_register_gas_url', url.trim());
    } else {
      localStorage.removeItem('everyone_register_gas_url');
    }
  },
  
  // URL이 비어있거나 올바르지 않은 경우 로컬 Mock 모드로 동작
  isMockMode() {
    const url = this.getGasUrl();
    return !url || url === 'mock' || !url.startsWith('https://script.google.com');
  }
};
