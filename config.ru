require 'sinatra'
require 'json'

mime_type :less, 'text/css'

get '/' do
  redirect '/index.html'
end

get '/tasks.js' do
  tasks = {}
  Dir['tasks/*/*'].each do |path|
    section, task = path.split('/')[1..2]
    description, code = File.readlines(path).join.split(/^--$/m).
      collect { |text| text.strip }[0..1]
    (tasks[section] ||= {})[task] = 
      {:description => description, :code => code}
  end
  JSON(tasks)
end

run Sinatra::Application
