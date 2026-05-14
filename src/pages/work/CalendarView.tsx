import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TASK_PRIORITIES } from '../../lib/constants'

export function CalendarView({ tasks }: { tasks: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getTasksForDay(day: Date) {
    return tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day))
  }

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  function getTaskClass(task: any) {
    if (task.status === 'done') return 'line-through text-muted-foreground bg-muted'
    if (task.status === 'rejected') return 'line-through text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/20'
    if (task.status === 'couldnt_do') return 'line-through text-orange-400 dark:text-orange-500 bg-orange-50 dark:bg-orange-900/20'
    const priority = TASK_PRIORITIES.find((p) => p.id === task.priority)
    if (priority?.id === 'high') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    if (priority?.id === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayTasks = getTasksForDay(day)
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)

          return (
            <div
              key={idx}
              className={`min-h-[100px] p-1.5 border-b border-r border-border ${
                !inMonth ? 'bg-muted/30' : ''
              }`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center text-sm mb-1 rounded-full font-medium ${
                  today
                    ? 'bg-primary text-primary-foreground'
                    : inMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/40'
                }`}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    title={task.title}
                    className={`text-[11px] leading-tight px-1.5 py-0.5 rounded truncate font-medium cursor-default ${getTaskClass(task)}`}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 px-5 py-3 border-t border-border text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/40" /> High</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/40" /> Medium</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40" /> Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted-foreground/20" /> Done</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/30" /> Couldn't Do</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/20" /> Rejected</div>
      </div>
    </div>
  )
}
