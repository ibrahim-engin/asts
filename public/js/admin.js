/**
 * ASTS - Aile Sağlık Takip Sistemi Admin Panel JavaScript Dosyası
 */

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    // Bootstrap bileşenlerini başlat
    initBootstrapComponents();
    
    // Sidebar daraltma/genişletme
    initSidebar();
    
    // Veri tablolarını başlat
    initDataTables();
    
    // İstatistik dashboard grafiklerini yükle
    initDashboardCharts();
    
    // Veri yönetimi fonksiyonları
    initDataManagement();
    
    // Kullanıcı durumu değiştirme
    initUserStatusToggle();
    
    // Arama fonksiyonlarını başlat
    initSearch();
    
    // Form doğrulama
    initFormValidation();
    
    // Modal içi formlar
    initModalForms();
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
  }
  
  /**
   * Sidebar daraltma/genişletme
   */
  function initSidebar() {
    var sidebarCollapse = document.getElementById('sidebarCollapse');
    var sidebar = document.querySelector('.sidebar');
    
    if (sidebarCollapse && sidebar) {
      sidebarCollapse.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        
        // Sidebar durumunu localStorage'a kaydet
        if (sidebar.classList.contains('active')) {
          localStorage.setItem('sidebar-collapsed', 'true');
        } else {
          localStorage.setItem('sidebar-collapsed', 'false');
        }
      });
      
      // Sayfa yüklendiğinde localStorage'dan sidebar durumunu al
      if (localStorage.getItem('sidebar-collapsed') === 'true') {
        sidebar.classList.add('active');
      }
    }
    
    // Responsive modda sidebar'ı kapat
    var contentArea = document.querySelector('.content-wrapper');
    
    if (contentArea && window.innerWidth < 992) {
      contentArea.addEventListener('click', function() {
        sidebar.classList.remove('active');
      });
    }
  }
  
  /**
   * Veri tablolarını başlat
   */
  function initDataTables() {
    var tables = document.querySelectorAll('.data-table');
    
    tables.forEach(function(table) {
      // Tablo başlık satırı
      var thead = table.querySelector('thead');
      
      if (thead) {
        // Sıralama için tıklanabilir başlıklar
        var headers = thead.querySelectorAll('th[data-sortable="true"]');
        
        headers.forEach(function(header) {
          header.addEventListener('click', function() {
            var sortDirection = this.getAttribute('data-sort-direction') || 'asc';
            var sortField = this.getAttribute('data-sort-field');
            
            // Tüm başlıkların yön değerlerini sıfırla
            headers.forEach(function(h) {
              h.removeAttribute('data-sort-direction');
              h.querySelector('.sort-icon')?.remove();
            });
            
            // Yeni yönü ayarla ve ikon ekle
            if (sortDirection === 'asc') {
              this.setAttribute('data-sort-direction', 'desc');
              this.innerHTML += '<span class="sort-icon ms-1"><i class="fas fa-sort-down"></i></span>';
            } else {
              this.setAttribute('data-sort-direction', 'asc');
              this.innerHTML += '<span class="sort-icon ms-1"><i class="fas fa-sort-up"></i></span>';
            }
            
            // Sıralama için AJAX isteği gönder veya client-side sıralama
            sortTable(table, sortField, sortDirection);
          });
        });
      }
      
      // Sayfalama
      var pagination = document.querySelector('.pagination[data-table="' + table.id + '"]');
      
      if (pagination) {
        var pageLinks = pagination.querySelectorAll('.page-link');
        
        pageLinks.forEach(function(link) {
          link.addEventListener('click', function(event) {
            event.preventDefault();
            
            var page = this.getAttribute('data-page');
            var currentPage = pagination.getAttribute('data-current-page');
            var totalPages = pagination.getAttribute('data-total-pages');
            
            if (page === 'prev' && currentPage > 1) {
              page = parseInt(currentPage) - 1;
            } else if (page === 'next' && currentPage < totalPages) {
              page = parseInt(currentPage) + 1;
            }
            
            // Sayfa değişimi için AJAX isteği
            changeTablePage(table, page);
          });
        });
      }
      
      // Her sayfa satır sayısı seçici
      var rowSelector = document.querySelector('.row-selector[data-table="' + table.id + '"]');
      
      if (rowSelector) {
        rowSelector.addEventListener('change', function() {
          var rowCount = this.value;
          
          // Satır sayısı değişimi için AJAX isteği
          changeRowCount(table, rowCount);
        });
      }
    });
  }
  
  /**
   * Tabloyu client-side sırala
   */
  function sortTable(table, field, direction) {
    var rows = Array.from(table.querySelectorAll('tbody tr'));
    var headerRow = table.querySelector('thead tr');
    var headers = headerRow.querySelectorAll('th');
    var fieldIndex = 0;
    
    // Sıralanacak alan indeksini bul
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].getAttribute('data-sort-field') === field) {
        fieldIndex = i;
        break;
      }
    }
    
    // Sıralama fonksiyonu
    rows.sort(function(a, b) {
      var cellA = a.querySelectorAll('td')[fieldIndex];
      var cellB = b.querySelectorAll('td')[fieldIndex];
      
      var valueA = cellA.getAttribute('data-value') || cellA.textContent.trim();
      var valueB = cellB.getAttribute('data-value') || cellB.textContent.trim();
      
      // Sayısal değer kontrolü
      if (!isNaN(valueA) && !isNaN(valueB)) {
        valueA = parseFloat(valueA);
        valueB = parseFloat(valueB);
      }
      
      // Tarih kontrolü
      if (valueA.match(/^\d{2}\.\d{2}\.\d{4}$/) && valueB.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        var partsA = valueA.split('.');
        var partsB = valueB.split('.');
        
        valueA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
        valueB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      }
      
      // Sıralama yönüne göre karşılaştırma
      if (direction === 'asc') {
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        return 0;
      } else {
        if (valueA > valueB) return -1;
        if (valueA < valueB) return 1;
        return 0;
      }
    });
    
    // Sıralanmış satırları tabloya ekle
    var tbody = table.querySelector('tbody');
    
    rows.forEach(function(row) {
      tbody.appendChild(row);
    });
  }
  
  /**
   * Sayfa değiştirme - AJAX ile
   */
  function changeTablePage(table, page) {
    // Mevcut URL'i al
    var url = new URL(window.location.href);
    
    // Sayfa parametresini güncelle
    url.searchParams.set('page', page);
    
    // Sayfayı yeniden yükle
    window.location.href = url.toString();
  }
  
  /**
   * Satır sayısı değiştirme - AJAX ile
   */
  function changeRowCount(table, rowCount) {
    // Mevcut URL'i al
    var url = new URL(window.location.href);
    
    // Limit parametresini güncelle
    url.searchParams.set('limit', rowCount);
    
    // Sayfa parametresini sıfırla
    url.searchParams.set('page', 1);
    
    // Sayfayı yeniden yükle
    window.location.href = url.toString();
  }
  
  /**
   * Dashboard grafiklerini başlat
   */
  function initDashboardCharts() {
    // Kullanıcı istatistikleri grafiği
    var userChart = document.getElementById('userStatsChart');
    
    if (userChart) {
      var ctx = userChart.getContext('2d');
      
      // AJAX ile veri getir
      fetchDashboardData('/admin/api/stats/users', function(err, data) {
        if (err) {
          console.error('Kullanıcı istatistikleri alınamadı:', err);
          return;
        }
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [{
              label: 'Yeni Kullanıcılar',
              backgroundColor: 'rgba(78, 115, 223, 0.05)',
              borderColor: 'rgba(78, 115, 223, 1)',
              pointBackgroundColor: 'rgba(78, 115, 223, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
              data: data.values
            }]
          },
          options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      });
    }
    
    // Sağlık verisi dağılımı grafiği
    var healthDataChart = document.getElementById('healthDataChart');
    
    if (healthDataChart) {
      var ctx = healthDataChart.getContext('2d');
      
      // AJAX ile veri getir
      fetchDashboardData('/admin/api/stats/health-data', function(err, data) {
        if (err) {
          console.error('Sağlık verisi istatistikleri alınamadı:', err);
          return;
        }
        
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: data.labels,
            datasets: [{
              data: data.values,
              backgroundColor: [
                '#4e73df',
                '#1cc88a',
                '#36b9cc',
                '#f6c23e',
                '#858796'
              ],
              hoverBackgroundColor: [
                '#2e59d9',
                '#17a673',
                '#2c9faf',
                '#f4b619',
                '#6e707e'
              ],
              hoverBorderColor: "rgba(234, 236, 244, 1)",
            }]
          },
          options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
              legend: {
                position: 'right'
              }
            }
          }
        });
      });
    }
  }
  
  /**
   * Dashboard verileri için AJAX isteği
   */
  function fetchDashboardData(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            callback(null, response.data);
          } else {
            callback(response.error, null);
          }
        } else {
          callback('İstek başarısız: ' + xhr.status, null);
        }
      }
    };
    
    xhr.send();
  }
  
  /**
   * Veri yönetimi fonksiyonları
   */
  function initDataManagement() {
    // Kullanıcı silme işlemi
    var deleteUserButtons = document.querySelectorAll('.delete-user');
    
    deleteUserButtons.forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        
        var userId = this.getAttribute('data-user-id');
        var userName = this.getAttribute('data-user-name');
        
        if (confirm(userName + ' kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
          deleteUser(userId);
        }
      });
    });
    
    // Admin silme işlemi
    var deleteAdminButtons = document.querySelectorAll('.delete-admin');
    
    deleteAdminButtons.forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        
        var adminId = this.getAttribute('data-admin-id');
        var adminName = this.getAttribute('data-admin-name');
        
        if (confirm(adminName + ' admin kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
          deleteAdmin(adminId);
        }
      });
    });
  }
  
  /**
   * Kullanıcı silme AJAX isteği
   */
  function deleteUser(userId) {
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', '/admin/users/' + userId, true);
    
    // Yükleme göstergesini göster
    showLoading();
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        // Yükleme göstergesini gizle
        hideLoading();
        
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // Başarılı mesajını göster
            showNotification('Kullanıcı başarıyla silindi', 'success');
            
            // Sayfayı yenile (veya DOM'dan kullanıcıyı kaldır)
            setTimeout(function() {
              window.location.reload();
            }, 1000);
          } else {
            showNotification('Kullanıcı silinemedi: ' + response.error, 'danger');
          }
        } else {
          showNotification('İstek başarısız: ' + xhr.status, 'danger');
        }
      }
    };
    
    xhr.send();
  }
  
  /**
   * Admin silme AJAX isteği
   */
  function deleteAdmin(adminId) {
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', '/admin/admins/' + adminId, true);
    
    // Yükleme göstergesini göster
    showLoading();
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        // Yükleme göstergesini gizle
        hideLoading();
        
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // Başarılı mesajını göster
            showNotification('Admin başarıyla silindi', 'success');
            
            // Sayfayı yenile (veya DOM'dan admin'i kaldır)
            setTimeout(function() {
              window.location.reload();
            }, 1000);
          } else {
            showNotification('Admin silinemedi: ' + response.error, 'danger');
          }
        } else {
          showNotification('İstek başarısız: ' + xhr.status, 'danger');
        }
      }
    };
    
    xhr.send();
  }
  
  /**
   * Kullanıcı durumu değiştirme
   */
  function initUserStatusToggle() {
    var statusToggleButtons = document.querySelectorAll('.toggle-status');
    
    statusToggleButtons.forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        
        var userId = this.getAttribute('data-user-id');
        var isAdmin = this.getAttribute('data-is-admin') === 'true';
        var currentStatus = this.getAttribute('data-current-status') === 'true';
        
        if (isAdmin) {
          toggleAdminStatus(userId, !currentStatus, this);
        } else {
          toggleUserStatus(userId, !currentStatus, this);
        }
      });
    });
  }
  
  /**
   * Kullanıcı durumu değiştirme AJAX isteği
   */
  function toggleUserStatus(userId, newStatus, buttonElement) {
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', '/admin/users/' + userId + '/status', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Buton yükleniyor göster
    buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    buttonElement.disabled = true;
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // Duruma göre buton stilini güncelle
            if (response.data.isActive) {
              buttonElement.innerHTML = '<i class="fas fa-toggle-on text-success"></i>';
              buttonElement.setAttribute('data-current-status', 'true');
              buttonElement.setAttribute('title', 'Devre Dışı Bırak');
            } else {
              buttonElement.innerHTML = '<i class="fas fa-toggle-off text-danger"></i>';
              buttonElement.setAttribute('data-current-status', 'false');
              buttonElement.setAttribute('title', 'Aktif Et');
            }
            
            // Tooltip'i yenile
            var tooltip = bootstrap.Tooltip.getInstance(buttonElement);
            if (tooltip) {
              tooltip.dispose();
            }
            new bootstrap.Tooltip(buttonElement);
            
            // Bildirim göster
            showNotification('Kullanıcı durumu güncellendi', 'success');
          } else {
            // Hata durumunda eski haline getir
            buttonElement.innerHTML = newStatus ? 
              '<i class="fas fa-toggle-on text-success"></i>' : 
              '<i class="fas fa-toggle-off text-danger"></i>';
            
            showNotification('Durum güncellenemedi: ' + response.error, 'danger');
          }
        } else {
          // Hata durumunda eski haline getir
          buttonElement.innerHTML = newStatus ? 
            '<i class="fas fa-toggle-on text-success"></i>' : 
            '<i class="fas fa-toggle-off text-danger"></i>';
          
          showNotification('İstek başarısız: ' + xhr.status, 'danger');
        }
        
        buttonElement.disabled = false;
      }
    };
    
    xhr.send(JSON.stringify({ isActive: newStatus }));
  }
  
  /**
   * Admin durumu değiştirme AJAX isteği
   */
  function toggleAdminStatus(adminId, newStatus, buttonElement) {
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', '/admin/admins/' + adminId + '/status', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Buton yükleniyor göster
    buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    buttonElement.disabled = true;
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // Duruma göre buton stilini güncelle
            if (response.data.isActive) {
              buttonElement.innerHTML = '<i class="fas fa-toggle-on text-success"></i>';
              buttonElement.setAttribute('data-current-status', 'true');
              buttonElement.setAttribute('title', 'Devre Dışı Bırak');
            } else {
              buttonElement.innerHTML = '<i class="fas fa-toggle-off text-danger"></i>';
              buttonElement.setAttribute('data-current-status', 'false');
              buttonElement.setAttribute('title', 'Aktif Et');
            }
            
            // Tooltip'i yenile
            var tooltip = bootstrap.Tooltip.getInstance(buttonElement);
            if (tooltip) {
              tooltip.dispose();
            }
            new bootstrap.Tooltip(buttonElement);
            
            // Bildirim göster
            showNotification('Admin durumu güncellendi', 'success');
          } else {
            // Hata durumunda eski haline getir
            buttonElement.innerHTML = newStatus ? 
              '<i class="fas fa-toggle-on text-success"></i>' : 
              '<i class="fas fa-toggle-off text-danger"></i>';
            
            showNotification('Durum güncellenemedi: ' + response.error, 'danger');
          }
        } else {
          // Hata durumunda eski haline getir
          buttonElement.innerHTML = newStatus ? 
            '<i class="fas fa-toggle-on text-success"></i>' : 
            '<i class="fas fa-toggle-off text-danger"></i>';
          
          showNotification('İstek başarısız: ' + xhr.status, 'danger');
        }
        
        buttonElement.disabled = false;
      }
    };
    
    xhr.send(JSON.stringify({ isActive: newStatus }));
  }
  
  /**
   * Arama fonksiyonları
   */
  function initSearch() {
    var searchForm = document.getElementById('searchForm');
    
    if (searchForm) {
      searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        var searchInput = document.getElementById('searchInput');
        var searchTerm = searchInput.value.trim();
        
        if (searchTerm.length < 2) {
          showNotification('Arama terimi en az 2 karakter olmalıdır', 'warning');
          return;
        }
        
        // Mevcut URL'i al
        var url = new URL(window.location.href);
        
        // Arama parametresini güncelle
        url.searchParams.set('search', searchTerm);
        
        // Sayfa parametresini sıfırla
        url.searchParams.set('page', 1);
        
        // Sayfayı yeniden yükle
        window.location.href = url.toString();
      });
      
      // Arama temizleme
      var clearSearchButton = document.getElementById('clearSearch');
      
      if (clearSearchButton) {
        clearSearchButton.addEventListener('click', function(event) {
          event.preventDefault();
          
          // Mevcut URL'i al
          var url = new URL(window.location.href);
          
          // Arama parametresini kaldır
          url.searchParams.delete('search');
          
          // Sayfa parametresini sıfırla
          url.searchParams.set('page', 1);
          
          // Sayfayı yeniden yükle
          window.location.href = url.toString();
        });
      }
    }
    
    // Tablo içi anlık filtreleme
    var tableFilter = document.getElementById('tableFilter');
    
    if (tableFilter) {
      tableFilter.addEventListener('input', function() {
        var filterValue = this.value.toLowerCase();
        var tableId = this.getAttribute('data-table');
        var table = document.getElementById(tableId);
        
        if (table) {
          var rows = table.querySelectorAll('tbody tr');
          
          rows.forEach(function(row) {
            var text = row.textContent.toLowerCase();
            
            if (text.indexOf(filterValue) > -1) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        }
      });
    }
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
      var confirmPassword = form.querySelector('input[name="confirmPassword"]');
      
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
   * Modal içi formlar
   */
  function initModalForms() {
    // Modal formları
    var modalForms = document.querySelectorAll('.modal-form');
    
    modalForms.forEach(function(form) {
      form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          return;
        }
        
        var formData = new FormData(form);
        var action = form.getAttribute('action');
        var method = form.getAttribute('method') || 'POST';
        
        // AJAX ile formu gönder
        var xhr = new XMLHttpRequest();
        xhr.open(method, action, true);
        
        // Yükleme göstergesini göster
        var submitButton = form.querySelector('[type="submit"]');
        var originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> İşleniyor...';
        submitButton.disabled = true;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            // Buton eski haline getir
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            
            if (xhr.status === 200 || xhr.status === 201) {
              var response = JSON.parse(xhr.responseText);
              
              if (response.success) {
                // Modal'ı kapat
                var modalId = form.closest('.modal').id;
                closeModal(modalId);
                
                // Başarılı mesajını göster
                showNotification(response.message || 'İşlem başarılı', 'success');
                
                // Sayfayı yenile (veya callback çağır)
                setTimeout(function() {
                  window.location.reload();
                }, 1000);
              } else {
                showNotification('Hata: ' + response.error, 'danger');
              }
            } else {
              showNotification('İstek başarısız: ' + xhr.status, 'danger');
            }
          }
        };
        
        xhr.send(new URLSearchParams(formData));
      });
    });
  }
  
  /**
   * Yardımcı fonksiyonlar
   */
  
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

// URL parametrelerini alma
function getUrlParameter(name) {
name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
var results = regex.exec(location.search);
return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Veri dışa aktarma işlevleri
function exportTableToExcel(tableId, fileName) {
var table = document.getElementById(tableId);

if (!table) {
  showNotification('Dışa aktarılacak tablo bulunamadı', 'danger');
  return;
}

var wb = XLSX.utils.table_to_book(table, { sheet: "Sayfa1" });
XLSX.writeFile(wb, fileName + '.xlsx');
}

function exportTableToPDF(tableId, fileName) {
var table = document.getElementById(tableId);

if (!table) {
  showNotification('Dışa aktarılacak tablo bulunamadı', 'danger');
  return;
}

var element = table.cloneNode(true);

html2pdf()
  .set({
    margin: 10,
    filename: fileName + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  })
  .from(element)
  .save();
}

// Doğrulama işlevleri
function confirmDelete(message, callback) {
if (confirm(message)) {
  callback();
}
}