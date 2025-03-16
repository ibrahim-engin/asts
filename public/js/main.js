/**
 * ASTS - Aile Sağlık Takip Sistemi Ana JavaScript Dosyası
 */

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    // Bootstrap bileşenlerini başlat
    initBootstrapComponents();
    
    // Alerts için otomatik kapat
    initAlertDismiss();
    
    // Form doğrulama
    initFormValidation();
    
    // Tarih ve saat elementi
    updateDateTime();
    
    // Grafikleri yükle (sayfada varsa)
    initCharts();
    
    // Hatırlatıcı sayacı
    initReminderCountdowns();
  });
  
  /**
   * Bootstrap bileşenlerini başlat
   */
  function initBootstrapComponents() {
    // Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Toasts
    var toastElList = [].slice.call(document.querySelectorAll('.toast'));
    toastElList.map(function(toastEl) {
      return new bootstrap.Toast(toastEl).show();
    });
  }
  
  /**
   * Alert'leri belirli bir süre sonra otomatik kapat
   */
  function initAlertDismiss() {
    // Otomatik kapanacak alertler
    var autoAlerts = document.querySelectorAll('.alert-dismissible:not(.alert-persistent)');
    
    autoAlerts.forEach(function(alert) {
      setTimeout(function() {
        new bootstrap.Alert(alert).close();
      }, 5000); // 5 saniye sonra kapat
    });
  }
  
  /**
   * Form doğrulama
   */
  function initFormValidation() {
    // Doğrulama gerektiren formlar
    var forms = document.querySelectorAll('.needs-validation');
    
    // Formu gönderme olayını izle
    Array.prototype.slice.call(forms).forEach(function(form) {
      form.addEventListener('submit', function(event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        form.classList.add('was-validated');
      }, false);
    });
    
    // Şifre eşleşme kontrolü
    var passwordForms = document.querySelectorAll('.password-validation');
    
    passwordForms.forEach(function(form) {
      var password = form.querySelector('input[name="password"]');
      var confirmPassword = form.querySelector('input[name="passwordConfirm"]');
      
      if (password && confirmPassword) {
        confirmPassword.addEventListener('input', function() {
          if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
          } else {
            confirmPassword.setCustomValidity('');
          }
        });
      }
    });
  }
  
  /**
   * Tarih ve saat güncelleme
   */
  function updateDateTime() {
    var dateTimeElement = document.getElementById('currentDateTime');
    
    if (dateTimeElement) {
      // Tarih ve saati güncelle
      function updateTime() {
        var now = new Date();
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        dateTimeElement.textContent = now.toLocaleDateString('tr-TR', options);
      }
      
      // İlk güncelleme
      updateTime();
      
      // Her saniye güncelle
      setInterval(updateTime, 1000);
    }
  }
  
  /**
   * Grafikleri başlat (sayfada varsa)
   */
  function initCharts() {
    // Sağlık verisi zaman serisi grafikleri
    initHealthDataCharts();
    
    // İlaç uyum grafiği
    initMedicationAdherenceChart();
    
    // Genel istatistik grafiği
    initStatisticsChart();
  }
  
  /**
   * Sağlık verisi grafiklerini başlat
   */
  function initHealthDataCharts() {
    // Kan şekeri grafiği
    var bloodSugarChartEl = document.getElementById('bloodSugarChart');
    
    if (bloodSugarChartEl) {
      var ctx = bloodSugarChartEl.getContext('2d');
      
      // Veri alanını kontrol et
      if (typeof bloodSugarChartData !== 'undefined' && bloodSugarChartData) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: bloodSugarChartData.labels,
            datasets: [{
              label: 'Kan Şekeri (mg/dL)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              pointBackgroundColor: function(context) {
                var index = context.dataIndex;
                var value = context.dataset.data[index];
                
                // Değer bazlı renklendirme
                if (value < 70) return 'rgba(255, 206, 86, 1)'; // Düşük
                if (value > 180) return 'rgba(255, 99, 132, 1)'; // Yüksek
                return 'rgba(75, 192, 192, 1)'; // Normal
              },
              pointRadius: 5,
              pointHoverRadius: 7,
              data: bloodSugarChartData.data
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: false,
                suggestedMin: 60,
                suggestedMax: 200
              }
            },
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    var label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += context.parsed.y + ' mg/dL';
                    }
                    return label;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Tansiyon grafiği
    var bloodPressureChartEl = document.getElementById('bloodPressureChart');
    
    if (bloodPressureChartEl) {
      var ctx = bloodPressureChartEl.getContext('2d');
      
      // Veri alanını kontrol et
      if (typeof bloodPressureChartData !== 'undefined' && bloodPressureChartData) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: bloodPressureChartData.labels,
            datasets: [{
              label: 'Büyük Tansiyon (mmHg)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              data: bloodPressureChartData.systolic
            },
            {
              label: 'Küçük Tansiyon (mmHg)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              data: bloodPressureChartData.diastolic
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: false,
                suggestedMin: 40,
                suggestedMax: 200
              }
            }
          }
        });
      }
    }
  }
  
  /**
   * İlaç uyum grafiğini başlat
   */
  function initMedicationAdherenceChart() {
    var adherenceChartEl = document.getElementById('medicationAdherenceChart');
    
    if (adherenceChartEl) {
      var ctx = adherenceChartEl.getContext('2d');
      
      // Veri alanını kontrol et
      if (typeof medicationAdherenceData !== 'undefined' && medicationAdherenceData) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: medicationAdherenceData.labels,
            datasets: [{
              label: 'İlaç Uyum Oranı (%)',
              backgroundColor: function(context) {
                var index = context.dataIndex;
                var value = context.dataset.data[index];
                
                if (value < 50) return 'rgba(255, 99, 132, 0.7)'; // Düşük uyum
                if (value < 80) return 'rgba(255, 206, 86, 0.7)'; // Orta uyum
                return 'rgba(75, 192, 192, 0.7)'; // İyi uyum
              },
              borderColor: 'rgba(0, 0, 0, 0.1)',
              borderWidth: 1,
              data: medicationAdherenceData.data
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                max: 100
              }
            }
          }
        });
      }
    }
  }
  
  /**
   * Genel istatistik grafiğini başlat
   */
  function initStatisticsChart() {
    var statsChartEl = document.getElementById('statisticsChart');
    
    if (statsChartEl) {
      var ctx = statsChartEl.getContext('2d');
      
      // Veri alanını kontrol et
      if (typeof statsChartData !== 'undefined' && statsChartData) {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: statsChartData.labels,
            datasets: [{
              data: statsChartData.data,
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)'
              ],
              borderColor: 'rgba(255, 255, 255, 1)',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right'
              }
            }
          }
        });
      }
    }
  }
  
  /**
   * Hatırlatıcı sayaçlarını başlat
   */
  function initReminderCountdowns() {
    var reminderItems = document.querySelectorAll('.reminder-countdown');
    
    reminderItems.forEach(function(item) {
      var targetTime = new Date(item.getAttribute('data-target-time')).getTime();
      
      function updateCountdown() {
        var now = new Date().getTime();
        var distance = targetTime - now;
        
        if (distance <= 0) {
          item.innerHTML = '<span class="badge bg-danger">Zamanı Geldi!</span>';
          return;
        }
        
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        item.innerHTML = `<span class="badge bg-info">${hours}sa ${minutes}dk kaldı</span>`;
      }
      
      // İlk güncelleme
      updateCountdown();
      
      // Her dakika güncelle
      setInterval(updateCountdown, 60000);
    });
  }
  
  /**
   * Filtreleme işlevleri
   */
  function filterTable() {
    var input = document.getElementById('tableSearch');
    var filter = input.value.toUpperCase();
    var table = document.getElementById('dataTable');
    
    if (input && table) {
      var tr = table.getElementsByTagName('tr');
      
      for (var i = 1; i < tr.length; i++) {
        var found = false;
        var td = tr[i].getElementsByTagName('td');
        
        for (var j = 0; j < td.length; j++) {
          var cell = td[j];
          if (cell) {
            var txtValue = cell.textContent || cell.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
              found = true;
              break;
            }
          }
        }
        
        if (found) {
          tr[i].style.display = '';
        } else {
          tr[i].style.display = 'none';
        }
      }
    }
  }
  
  /**
   * AJAX işlevleri
   */
  
  // Genel AJAX GET isteği
  function ajaxGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          callback(null, response);
        } else {
          callback('İstek başarısız: ' + xhr.status, null);
        }
      }
    };
    
    xhr.send();
  }
  
  // Genel AJAX POST isteği
  function ajaxPost(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 201) {
          var response = JSON.parse(xhr.responseText);
          callback(null, response);
        } else {
          callback('İstek başarısız: ' + xhr.status, null);
        }
      }
    };
    
    xhr.send(JSON.stringify(data));
  }
  
  /**
   * Yardımcı işlevler
   */
  
  // Tarih biçimlendirme
  function formatDate(date, withTime = false) {
    var dateObj = new Date(date);
    var day = dateObj.getDate().toString().padStart(2, '0');
    var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    var year = dateObj.getFullYear();
    
    var formatted = day + '.' + month + '.' + year;
    
    if (withTime) {
      var hours = dateObj.getHours().toString().padStart(2, '0');
      var minutes = dateObj.getMinutes().toString().padStart(2, '0');
      formatted += ' ' + hours + ':' + minutes;
    }
    
    return formatted;
  }
  
  // Sayı biçimlendirme
  function formatNumber(number, decimals = 2) {
    return parseFloat(number).toFixed(decimals);
  }
  
  // Modal açıp kapatma yardımcısı
  function showModal(modalId) {
    var modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  }
  
  function closeModal(modalId) {
    var modalElement = document.getElementById(modalId);
    var modal = bootstrap.Modal.getInstance(modalElement);
    
    if (modal) {
      modal.hide();
    }
  }
  
  // Bildirim gösterme
  function showNotification(message, type = 'success') {
    var toastContainer = document.getElementById('toastContainer');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    var toastId = 'toast-' + new Date().getTime();
    var bgClass = 'bg-' + type;
    
    var toastHtml = `
      <div id="${toastId}" class="toast ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">Bildirim</strong>
          <small>${formatDate(new Date(), true)}</small>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Kapat"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    var toastElement = document.getElementById(toastId);
    var toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
      toastElement.remove();
    });
  }
  
  // Onay kutusu
  function confirmAction(message, callback) {
    if (confirm(message)) {
      callback();
    }
  }
  
  // Form veri doğrulama
  function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
  
  function validatePhone(phone) {
    var re = /^[0-9]{10}$/;
    return re.test(String(phone));
  }
  
  // Yükleme göstergesi
  function showLoading() {
    var loadingEl = document.createElement('div');
    loadingEl.id = 'loadingIndicator';
    loadingEl.className = 'position-fixed w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75';
    loadingEl.style.top = '0';
    loadingEl.style.left = '0';
    loadingEl.style.zIndex = '9999';
    
    loadingEl.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Yükleniyor...</span>
      </div>
    `;
    
    document.body.appendChild(loadingEl);
  }
  
  function hideLoading() {
    var loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
      loadingEl.remove();
    }
  }