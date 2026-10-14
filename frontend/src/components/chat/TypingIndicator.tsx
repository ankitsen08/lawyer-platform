export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 bg-white border border-color-border-light shadow-sm p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl w-16">
      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}
