require 'sinatra'
require 'json'

mime_type :less, 'text/css'

get '/' do
  redirect '/index.html'
end

get '/tasks.js' do
  JSON(Dir['tasks/*/*'].sort.reverse.inject({}) { |sections, path|
    section, task = path.split('/')[1..2]
    sections[section] ||= {:name => section, :tasks => []}

    description, code = File.readlines(path).join.split(/^--$/m).
      collect { |text| text.strip }[0..1]

    sections[section][:tasks].push({
      :name => task, :description => description, :code => code
    })
    sections
  }.values)
end

run Sinatra::Application
