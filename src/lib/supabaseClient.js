import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gqfopwshzrvajsppzcqm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZm9wd3NoenJ2YWpzcHB6Y3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc3ODg5NjcsImV4cCI6MjA0MzM2NDk2N30.x_Z03oKk3fWl3c23r2wYrqsS9vj2f_G5X2x-3u2bs5I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)