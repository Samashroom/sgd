const { createApp } = Vue;

createApp({
    data() {
        return {
            comicData: {
                title: '',
                chapters: []
            },
            currentChapterId: 1,
            currentPage: 1,
            jumpPage: null,
            imageLoaded: false,
            imageError: false,
            showThumbnails: false
        };
    },
    
    computed: {
        currentChapter() {
            return this.comicData.chapters.find(ch => ch.id === this.currentChapterId) || {};
        },
        
        currentImageUrl() {
            if (!this.currentChapter.folder) return '';
            const pageNum = this.currentPage.toString().padStart(2, '0');
            return `${this.currentChapter.folder}/${pageNum}.png`;
        }
    },
    
    methods: {
        async loadComicData() {
            try {
                const response = await fetch('comics-data.json');
                if (!response.ok) throw new Error('Ошибка загрузки данных');
                this.comicData = await response.json();
                this.loadChapter();
            } catch (error) {
                console.error('Ошибка загрузки данных комикса:', error);
                // Заглушка если файл не загрузился
                this.comicData = {
                    title: "Мой Комикс",
                    chapters: [{
                        id: 1,
                        title: "Глава 1",
                        folder: "chapter/01",
                        pages: 10,
                        startPage: 1
                    }]
                };
            }
        },
        
        loadChapter() {
            this.currentPage = this.currentChapter.startPage || 1;
            this.jumpPage = null;
            this.imageLoaded = false;
            this.imageError = false;
        },
        
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.resetImageState();
            }
        },
        
        nextPage() {
            if (this.currentPage < this.currentChapter.pages) {
                this.currentPage++;
                this.resetImageState();
            }
        },
        
        goToPage(page) {
            const pageNum = parseInt(page);
            if (!isNaN(pageNum) && 
                pageNum >= 1 && 
                pageNum <= this.currentChapter.pages) {
                this.currentPage = pageNum;
                this.resetImageState();
            }
            this.jumpPage = null;
        },
        
        getImageUrl(page) {
            const pageNum = page.toString().padStart(2, '0');
            return `${this.currentChapter.folder}/${pageNum}.png`;
        },
        
        resetImageState() {
            this.imageLoaded = false;
            this.imageError = false;
        },
        
        toggleThumbnails() {
            this.showThumbnails = !this.showThumbnails;
        },
        
        handleKeydown(event) {
            switch(event.key) {
                case 'ArrowLeft':
                    this.prevPage();
                    break;
                case 'ArrowRight':
                case ' ':
                    if (event.key === ' ' && event.target === document.body) {
                        event.preventDefault();
                    }
                    this.nextPage();
                    break;
            }
        }
    },
    
    mounted() {
        this.loadComicData();
        document.addEventListener('keydown', this.handleKeydown);
    },
    
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
    }
}).mount('#app');