<script>
  import dayjs from 'dayjs';
  import 'dayjs/locale/ja';
  
  dayjs.locale('ja');
  
  let { isOpen, date, events, onClose } = $props();
  
  function formatDate(dateStr) {
    if (!dateStr) return '';
    return dayjs(dateStr).format('YYYY年M月D日（ddd）');
  }

  function formatCurrency(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0
    }).format(value);
  }
  
  const totalAmount = $derived.by(() =>
    events?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0
  );
  
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
      <div class="flex items-center gap-3 p-4 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground flex-1">支払い情報</h2>
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
      
      <div class="p-4 space-y-4">
        <div class="flex items-center gap-3 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span class="text-foreground">{formatDate(date)}</span>
        </div>
        
        <div class="rounded-lg border border-border bg-muted/40 p-4">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span>支払い予定</span>
          </div>
          <div class="mt-1 text-2xl font-semibold text-foreground">
            {formatCurrency(totalAmount)}
          </div>
        </div>
        
        {#if events && events.length > 0}
          <div class="rounded-lg border border-border bg-card">
            {#each events as item, index (item.id)}
              <div class="flex items-center justify-between gap-3 px-4 py-3 {index !== events.length - 1 ? 'border-b border-border' : ''}">
                <span class="text-sm text-foreground truncate">{item.title}</span>
                <span class="text-sm font-semibold text-foreground">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">この日の支払い予定はありません。</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
