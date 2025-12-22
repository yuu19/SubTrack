<script>
  import dayjs from 'dayjs';
  let { isOpen, selectedDate, event, onClose, onSave, onDelete } = $props();
  
  let title = $state(event?.title || '');
  let amount = $state(event?.amount != null ? String(event.amount) : '');
  let color = $state(event?.color || 'blue');
  let description = $state(event?.description || '');
  
  const colors = [
    { name: 'blue', label: '青', color: 'color-mix(in oklch, var(--primary) 90%, var(--background) 10%)' },
    { name: 'green', label: '緑', color: 'color-mix(in oklch, var(--primary) 85%, var(--background) 15%)' },
    { name: 'red', label: '赤', color: 'color-mix(in oklch, var(--primary) 80%, var(--background) 20%)' },
    { name: 'yellow', label: '黄', color: 'color-mix(in oklch, var(--primary) 75%, var(--background) 25%)' },
    { name: 'purple', label: '紫', color: 'color-mix(in oklch, var(--primary) 70%, var(--background) 30%)' },
    { name: 'orange', label: 'オレンジ', color: 'color-mix(in oklch, var(--primary) 65%, var(--background) 35%)' }
  ];
  
  function formatDate(date) {
    if (!date) return '';
    return dayjs(date).format('YYYY年M月D日（ddd）');
  }
  
  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue)) return;
    
    onSave({
      id: event?.id || crypto.randomUUID(),
      title: title.trim(),
      date: dayjs(selectedDate).format('YYYY-MM-DD'),
      amount: amountValue,
      color,
      description: description.trim()
    });
  }
  
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onkeydown={handleKeyDown}
  >
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground">
          {event ? '予定を編集' : '新しい予定'}
        </h2>
        <button
          onclick={onClose}
          class="p-1 hover:bg-muted rounded-lg transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      
      <form onsubmit={handleSubmit} class="p-4 space-y-4">
        <div>
          <span class="block text-sm font-medium text-foreground mb-1">日付</span>
          <p class="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        
        <div>
          <label for="title" class="block text-sm font-medium text-foreground mb-1">タイトル</label>
          <input
            id="title"
            type="text"
            bind:value={title}
            placeholder="予定のタイトル"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          />
        </div>
        
        <div>
          <label for="amount" class="block text-sm font-medium text-foreground mb-1">支払い予定金額</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
            <input
              id="amount"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              bind:value={amount}
              placeholder="例: 400"
              class="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
        </div>
        
        <fieldset>
          <legend class="block text-sm font-medium text-foreground mb-2">カラー</legend>
          <div class="flex gap-2" role="radiogroup">
            {#each colors as c (c.name)}
              <button
                type="button"
                onclick={() => color = c.name}
                class="w-8 h-8 rounded-full {color === c.name ? 'ring-2 ring-offset-2 ring-primary' : ''}"
                style:background-color={c.color}
                aria-label={c.label}
                role="radio"
                aria-checked={color === c.name}
              ></button>
            {/each}
          </div>
        </fieldset>
        
        <div>
          <label for="description" class="block text-sm font-medium text-foreground mb-1">メモ</label>
          <textarea
            id="description"
            bind:value={description}
            placeholder="詳細を入力..."
            rows="3"
            class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          ></textarea>
        </div>
        
        <div class="flex gap-2 pt-2">
          {#if event}
            <button
              type="button"
              onclick={() => onDelete(event.id)}
              class="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors"
            >
              削除
            </button>
          {/if}
          <div class="flex-1"></div>
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
