const { createApp } = Vue;

createApp({
    data() {
        return {
            chapters: [],
            currentChapterId: 1,
            currentPage: 1,
            loading: true,
            error: null,
            imageError: false,
            hideControls: true,
            controlsTimer: null,
            showTransition: false,
            isInitialized: false,
            
            // Для свайпов
            touchStartX: 0,
            touchStartY: 0,
            touchEndX: 0,
            touchEndY: 0,
            minSwipeDistance: 50, // минимальное расстояние для свайпа в пикселях
            maxVerticalSwipe: 30, // максимальное вертикальное отклонение для горизонтального свайпа
            isTouching: false
        };
    },
    computed: {
        currentChapter() {
            return this.chapters.find(ch => ch.id === this.currentChapterId) || {};
        },
        currentImage() {
            if (!this.currentChapter.folder) return '';
            const pageStr = this.currentPage.toString().padStart(2, '0');
            return `chapter/${this.currentChapter.folder}/${pageStr}.png`;
        },
        progressPercentage() {
            if (!this.currentChapter.pages) return 0;
            return (this.currentPage / this.currentChapter.pages) * 100;
        }
    },
    methods: {
        async loadChapters() {
            try {
                const response = await fetch('chapters.json');
                if (!response.ok) throw new Error('Не удалось загрузить данные глав');
                const data = await response.json();
                this.chapters = data.chapters;
                this.loading = false;
                
                // После загрузки глав восстанавливаем прогресс
                this.restoreProgress();
                this.isInitialized = true;
            } catch (err) {
                this.error = 'Ошибка загрузки глав: ' + err.message;
                this.loading = false;
                console.error(err);
            }
        },
        
        // Восстановление прогресса из localStorage
        restoreProgress() {
            try {
                const saved = localStorage.getItem('comic_progress');
                if (saved) {
                    const progress = JSON.parse(saved);
                    console.log('Восстанавливаем прогресс:', progress);
                    
                    // Проверяем валидность данных
                    const validChapter = this.chapters.find(ch => ch.id === progress.chapterId);
                    if (validChapter && progress.page >= 1 && progress.page <= validChapter.pages) {
                        this.currentChapterId = progress.chapterId;
                        this.currentPage = progress.page;
                        console.log('Прогресс восстановлен:', this.currentChapterId, this.currentPage);
                    } else {
                        console.log('Некорректный прогресс, начинаем сначала');
                    }
                } else {
                    console.log('Сохраненный прогресс не найден, начинаем сначала');
                }
            } catch (err) {
                console.error('Ошибка при восстановлении прогресса:', err);
            }
        },
        
        // Сохранение текущего прогресса
        saveProgress() {
            // Не сохраняем до инициализации
            if (!this.isInitialized || !this.chapters.length) return;
            
            const progress = {
                chapterId: this.currentChapterId,
                page: this.currentPage,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem('comic_progress', JSON.stringify(progress));
                console.log('Прогресс сохранен:', progress);
            } catch (err) {
                console.error('Ошибка при сохранении прогресса:', err);
            }
        },
        
        switchChapter(chapterId) {
            const chapter = this.chapters.find(ch => ch.id === chapterId);
            if (!chapter) return;
            
            this.currentChapterId = chapterId;
            this.currentPage = 1;
            this.imageError = false;
            this.showTransition = true;
            setTimeout(() => this.showTransition = false, 300);
            
            // Сохраняем прогресс
            this.saveProgress();
        },
        
        prevPage() {
            // Если не первая страница в главе
            if (this.currentPage > 1) {
                this.currentPage--;
                this.imageError = false;
                this.showTransition = true;
                setTimeout(() => this.showTransition = false, 300);
                this.saveProgress();
            } 
            // Если первая страница, но не первая глава
            else if (this.currentChapterId > 1) {
                const prevChapter = this.chapters.find(ch => ch.id === this.currentChapterId - 1);
                if (prevChapter) {
                    this.currentChapterId = prevChapter.id;
                    this.currentPage = prevChapter.pages;
                    this.imageError = false;
                    this.showTransition = true;
                    setTimeout(() => this.showTransition = false, 300);
                    this.saveProgress();
                }
            }
        },
        
        nextPage() {
            // Если не последняя страница в главе
            if (this.currentPage < this.currentChapter.pages) {
                this.currentPage++;
                this.imageError = false;
                this.showTransition = true;
                setTimeout(() => this.showTransition = false, 300);
                this.saveProgress();
            } 
            // Если последняя страница, но не последняя глава
            else if (this.currentChapterId < this.chapters.length) {
                const nextChapter = this.chapters.find(ch => ch.id === this.currentChapterId + 1);
                if (nextChapter) {
                    this.currentChapterId = nextChapter.id;
                    this.currentPage = 1;
                    this.imageError = false;
                    this.showTransition = true;
                    setTimeout(() => this.showTransition = false, 300);
                    this.saveProgress();
                }
            }
        },
        
        handleImageError() {
            this.imageError = true;
            console.error('Не удалось загрузить изображение:', this.currentImage);
        },
        
        showControls() {
            this.hideControls = false;
            
            clearTimeout(this.controlsTimer);
            this.controlsTimer = setTimeout(() => {
                this.hideControls = true;
            }, 3000);
        },
        
        toggleControls() {
            this.hideControls = !this.hideControls;
            if (!this.hideControls) {
                this.showControls();
            }
        },
        
        // Обработчик изменения страницы (используется в watcher)
        onPageChange() {
            if (this.isInitialized) {
                this.saveProgress();
            }
        },
        
        // === МЕТОДЫ ДЛЯ СВАЙПОВ ===
        
        handleTouchStart(event) {
            this.isTouching = true;
            this.touchStartX = event.changedTouches[0].screenX;
            this.touchStartY = event.changedTouches[0].screenY;
            this.touchEndX = this.touchStartX;
            this.touchEndY = this.touchStartY;
            
            // Останавливаем дальнейшую обработку, чтобы не мешать другим событиям
            event.stopPropagation();
        },
        
        handleTouchMove(event) {
            if (!this.isTouching) return;
            
            this.touchEndX = event.changedTouches[0].screenX;
            this.touchEndY = event.changedTouches[0].screenY;
            
            // Предотвращаем скролл страницы при горизонтальном свайпе
            const deltaX = this.touchEndX - this.touchStartX;
            if (Math.abs(deltaX) > 10) {
                event.preventDefault();
            }
        },
        
        handleTouchEnd(event) {
            if (!this.isTouching) return;
            this.isTouching = false;
            
            const deltaX = this.touchEndX - this.touchStartX;
            const deltaY = this.touchEndY - this.touchStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // Определяем направление свайпа
            if (absDeltaX > this.minSwipeDistance && absDeltaY < this.maxVerticalSwipe) {
                if (deltaX > 0) {
                    // Свайп вправо - предыдущая страница
                    this.prevPage();
                    this.showSwipeFeedback('right');
                } else {
                    // Свайп влево - следующая страница
                    this.nextPage();
                    this.showSwipeFeedback('left');
                }
                
                // Предотвращаем клик после свайпа
                event.preventDefault();
                event.stopPropagation();
            } else if (absDeltaY > this.minSwipeDistance && absDeltaX < this.maxVerticalSwipe) {
                // Вертикальный свайп - показываем/скрываем элементы управления
                if (deltaY > 0) {
                    // Свайп вниз - показываем элементы управления
                    this.showControls();
                } else {
                    // Свайп вверх - скрываем элементы управления
                    this.hideControls = true;
                }
                
                event.preventDefault();
                event.stopPropagation();
            }
            
            // Сбрасываем значения
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
        },
        
        handleTouchCancel() {
            this.isTouching = false;
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
        },
        
        // Визуальная обратная связь при свайпе
        showSwipeFeedback(direction) {
            const img = document.querySelector('.comic-image');
            if (!img) return;
            
            // Добавляем класс для анимации
            img.classList.add('swipe-feedback');
            img.classList.add(`swipe-${direction}`);
            
            // Убираем классы через короткое время
            setTimeout(() => {
                img.classList.remove('swipe-feedback');
                img.classList.remove(`swipe-${direction}`);
            }, 300);
        },
        
        // Инициализация свайпов
        initSwipe() {
            const appElement = document.getElementById('app');
            if (!appElement) return;
            
            // Добавляем обработчики свайпов
            appElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            appElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            appElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
            appElement.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
            
            console.log('Свайпы инициализированы');
        }
    },
    mounted() {
        this.loadChapters();
        
        // Инициализация свайпов
        this.initSwipe();
        
        // Управление клавишами
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.prevPage();
                    break;
                    
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.nextPage();
                    break;
                    
                case ' ':
                    e.preventDefault();
                    this.toggleControls();
                    break;
                    
                case 'Escape':
                    this.hideControls = true;
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    const chapterId = parseInt(e.key);
                    if (chapterId <= this.chapters.length) {
                        this.switchChapter(chapterId);
                    }
                    break;
            }
        });
        
        // Сохраняем прогресс при закрытии/скрытии страницы
        window.addEventListener('beforeunload', () => this.saveProgress());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveProgress();
            }
        });
        
        // Скрываем панель управления через 2 секунды
        setTimeout(() => {
            this.hideControls = true;
        }, 2000);
    },
    
    // Наблюдатель для автоматического сохранения при изменении страницы или главы
    watch: {
        currentPage() {
            this.onPageChange();
        },
        currentChapterId() {
            this.onPageChange();
        }
    }
}).mount('#app');