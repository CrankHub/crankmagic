extends Node3D
# Hologram and hex test scene: one hex realm, a forest that grows, a card set into its
# hex, an original figure that rises from the card, and a hologram of the card's
# art that the figure dissolves into when the camera pulls back.
# Everything is built in code so the whole project is three text files.
# Run with "-- --shot" to save near, far and side views to ./shots and quit.

const HEX_R := 1.0
const FIG_H := 1.5      # every figure is fitted to this height
const HOVER := 0.32     # how far a flying figure floats above its hex
const CARD_TILT := 75.0 # degrees from the ground
var card: Node3D
var card_rest := Vector3.ZERO
var glow: MeshInstance3D
var glow_mat: StandardMaterial3D
var playable := true
var seq: Tween
const CARD := "serra-angel"

var cam: Camera3D
var yaw := 0.6
var pitch := 0.72
var dist := 9.0
var auto := true
var t := 0.0
var focus := Vector3.ZERO
var figure: Node3D
var floaty: Node3D
var fig_meshes: Array[MeshInstance3D] = []
var wing_l: Node3D
var wing_r: Node3D
var holo: Sprite3D
var anim_player: AnimationPlayer
var anim_names: Array[String] = []
var anim_index := 0
var hud_label: Label
const HUD_TEXT := "Scroll to zoom  ·  right-drag to orbit  ·  P or double-click replays the card being played  ·  G toggles the playable glow"


func _ready() -> void:
	if "--selftest" in OS.get_cmdline_user_args():
		_selftest()
		return
	seed(7)
	_build_world()
	_build_hexes()
	_build_forest(_hex_pos(-1, 0))
	focus = _hex_pos(1, 0)
	_build_card(focus)
	_build_figure(focus)
	_build_hud()
	cam = Camera3D.new()
	cam.fov = 50.0
	add_child(cam)
	_place_camera()
	_play_card()
	if "--shot" in OS.get_cmdline_user_args():
		_shots()


func _mat(c: Color, emit := 0.0, rough := 0.75) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	return m


func _part(mesh: Mesh, m: Material, pos: Vector3, parent: Node3D) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = pos
	parent.add_child(mi)
	return mi


func _hex_pos(q: int, r: int) -> Vector3:
	return Vector3(HEX_R * 1.5 * q, 0.0, HEX_R * sqrt(3.0) * (r + q / 2.0))


func _build_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var psm := ProceduralSkyMaterial.new()
	psm.sky_top_color = Color(0.22, 0.32, 0.52)
	psm.sky_horizon_color = Color(0.86, 0.70, 0.55)
	psm.ground_horizon_color = Color(0.45, 0.38, 0.34)
	psm.ground_bottom_color = Color(0.08, 0.09, 0.11)
	sky.sky_material = psm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-42.0, -35.0, 0.0)
	sun.shadow_enabled = true
	sun.light_energy = 1.3
	sun.light_color = Color(1.0, 0.93, 0.82)
	add_child(sun)


func _build_hexes() -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = HEX_R * 0.96
	mesh.bottom_radius = HEX_R * 0.96
	mesh.height = 0.3
	mesh.radial_segments = 6
	mesh.rings = 1
	for q in range(-2, 3):
		for r in range(max(-2, -q - 2), min(2, -q + 2) + 1):
			var green := (q + r * 0.5 + randf_range(-0.6, 0.6)) < 0.4
			var base := Color(0.17, 0.29, 0.16) if green else Color(0.46, 0.23, 0.16)
			var c := base.lightened(randf_range(0.0, 0.12))
			var hex := _part(mesh, _mat(c, 0.0, 0.95), _hex_pos(q, r) + Vector3(0.0, -0.15, 0.0), self)
			hex.rotation.y = PI / 6.0


func _build_forest(at: Vector3) -> void:
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.03
	trunk.bottom_radius = 0.045
	trunk.height = 0.3
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 0.2
	cone.height = 0.5
	cone.radial_segments = 8
	var bark := _mat(Color(0.30, 0.20, 0.12))
	for i in 11:
		var tree := Node3D.new()
		var a := randf() * TAU
		var d := sqrt(randf()) * 0.68
		tree.position = at + Vector3(cos(a) * d, 0.0, sin(a) * d)
		add_child(tree)
		var leaf := _mat(Color(0.10, 0.30, 0.14).lightened(randf_range(0.0, 0.15)))
		_part(trunk, bark, Vector3(0.0, 0.15, 0.0), tree)
		_part(cone, leaf, Vector3(0.0, 0.5, 0.0), tree)
		_part(cone, leaf, Vector3(0.0, 0.74, 0.0), tree).scale = Vector3.ONE * 0.72
		var s := randf_range(0.8, 1.35)
		tree.scale = Vector3.ONE * 0.001
		var tw := create_tween()
		tw.tween_property(tree, "scale", Vector3.ONE * s, 1.0).set_delay(0.4 + i * 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _cache() -> String:
	return ProjectSettings.globalize_path("res://").path_join("../figures/cache").simplify_path()


func _tex(p: String) -> Texture2D:
	if not FileAccess.file_exists(p):
		push_warning("missing image: " + p)
		return null
	var img := Image.load_from_file(p)
	if img == null:
		return null
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)


func _build_card(at: Vector3) -> void:
	var info = JSON.parse_string(FileAccess.get_file_as_string(_cache().path_join("card/%s.json" % CARD)))
	if info == null:
		push_warning("card record not found; run the figure proof first")
		return
	# The whole card (2.5 x 3.5), 60% of the figure's height, standing behind it.
	# The full card carries its own artist credit and copyright line.
	var tex := _tex(_cache().path_join("full/%s.png" % info.id))
	var h := FIG_H * 0.6
	var w := h * 2.5 / 3.5
	card = Node3D.new()
	add_child(card)
	var face := QuadMesh.new()
	face.size = Vector2(w, h)
	var fm := StandardMaterial3D.new()
	fm.albedo_texture = tex
	fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_part(face, fm, Vector3(0.0, 0.0, 0.004), card)
	_part(face, _mat(Color(0.13, 0.11, 0.09), 0.0, 0.6), Vector3(0.0, 0.0, -0.004), card).rotation.y = PI
	var rim := QuadMesh.new()
	rim.size = Vector2(w + 0.06, h + 0.06)
	glow_mat = StandardMaterial3D.new()
	glow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	glow_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	glow_mat.albedo_color = Color(0.22, 1.0, 0.35)
	glow_mat.emission_enabled = true
	glow_mat.emission = Color(0.22, 1.0, 0.35)
	glow = _part(rim, glow_mat, Vector3.ZERO, card)
	# it lands flat at the figure's feet, then slides up behind the figure:
	# 75 degrees from the ground, centred on the figure's height (20% clear above and below)
	card_rest = at + Vector3(0.0, HOVER + FIG_H * 0.5, -0.5)
	var cut := _tex(_cache().path_join("cut/%s.png" % info.id))
	if cut != null:
		holo = Sprite3D.new()
		holo.texture = cut
		holo.pixel_size = 1.7 / cut.get_height()
		holo.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
		holo.position = at + Vector3(0.0, 1.05, 0.0)
		holo.modulate = Color(0.78, 0.92, 1.0, 0.0)
		add_child(holo)


# Playing the card: it leaves the hand (low in front of the camera), lands flat on
# its hex, then tilts up and back while the figure rises off its face, so the
# figure looks peeled from the card. P or a double-click replays it.
func _play_card() -> void:
	if card == null:
		return
	if seq != null:
		seq.kill()
	var flat := Quaternion(Vector3.RIGHT, -PI / 2.0)
	var stand := Quaternion(Vector3.RIGHT, deg_to_rad(-(90.0 - CARD_TILT)))
	var land := focus + Vector3(0.0, 0.02, 0.0)
	card.position = cam.global_position - cam.global_basis.z * 2.2 - cam.global_basis.y * 0.85
	card.quaternion = cam.global_basis.get_rotation_quaternion()
	figure.scale = Vector3.ONE * 0.02
	figure.position = land
	seq = create_tween().set_parallel(true)
	seq.tween_property(card, "position", land, 0.9).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	seq.tween_property(card, "quaternion", flat, 0.9).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	seq.tween_property(card, "position", card_rest, 1.5).set_delay(1.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	seq.tween_property(card, "quaternion", stand, 1.5).set_delay(1.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	seq.tween_property(figure, "scale", Vector3.ONE, 1.5).set_delay(1.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	seq.tween_property(figure, "position", focus, 1.5).set_delay(1.0).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)


# An original figure from the type line "Creature - Angel": two legs, two arms,
# wings, a sword. No part of it comes from the card's art.
func _build_figure(at: Vector3) -> void:
	figure = Node3D.new()
	figure.position = at
	add_child(figure)
	floaty = Node3D.new()
	figure.add_child(floaty)
	# a .glb dropped into ./models replaces the placeholder
	var model := _load_model()
	if model != null:
		floaty.add_child(model)
		_fit(model)
	else:
		_build_placeholder()
	for n in floaty.find_children("*", "MeshInstance3D", true, false):
		fig_meshes.append(n as MeshInstance3D)
	figure.scale = Vector3.ONE * 0.02


func _models_dir() -> String:
	return ProjectSettings.globalize_path("res://models")


func _load_model() -> Node3D:
	var dir := DirAccess.open(_models_dir())
	if dir == null:
		return null
	var names: Array[String] = []
	for f in dir.get_files():
		if f.to_lower().ends_with(".glb"):
			names.append(f)
	if names.is_empty():
		return null
	names.sort()
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(_models_dir().path_join(names[0]), st) != OK:
		push_warning("could not read model " + names[0])
		return null
	print("loaded model: ", names[0])
	return doc.generate_scene(st) as Node3D


# scale the model to figure height, stand it on the card, loop its first animation
func _fit(model: Node3D) -> void:
	var box := AABB()
	var first := true
	var inv := model.global_transform.affine_inverse()
	for n in model.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		var b: AABB = (inv * mi.global_transform) * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	if first or box.size.y <= 0.0:
		return
	var s := FIG_H / box.size.y
	model.scale = Vector3.ONE * s
	model.position = Vector3(-box.get_center().x * s, -box.position.y * s, -box.get_center().z * s)
	var players := model.find_children("*", "AnimationPlayer", true, false)
	if not players.is_empty():
		var ap := players[0] as AnimationPlayer
		var list := ap.get_animation_list()
		if not list.is_empty():
			anim_player = ap
			for a in list:
				ap.get_animation(a).loop_mode = Animation.LOOP_LINEAR
				anim_names.append(a)
			# start on an idle if the model has one
			for i in anim_names.size():
				if anim_names[i].to_lower().contains("idle"):
					anim_index = i
					break
			_play_anim()
			print("animations: ", list)


func _play_anim() -> void:
	if anim_player == null:
		return
	anim_player.play(anim_names[anim_index], 0.3)
	if hud_label != null:
		hud_label.text = HUD_TEXT + "\nAnimation %d of %d: %s   (Space for the next one)" % [anim_index + 1, anim_names.size(), anim_names[anim_index]]


func _selftest() -> void:
	var root := Node3D.new()
	add_child(root)
	var box := BoxMesh.new()
	box.size = Vector3(0.4, 2.0, 0.4)
	_part(box, _mat(Color(0.2, 0.5, 0.9)), Vector3(3.0, 5.0, 0.0), root)
	DirAccess.make_dir_recursive_absolute(_models_dir())
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	var err := doc.append_from_scene(root, st)
	if err == OK:
		err = doc.write_to_filesystem(st, _models_dir().path_join("_selftest.glb"))
	print("selftest export: ", err)
	get_tree().quit()


func _build_placeholder() -> void:
	var ivory := _mat(Color(0.93, 0.90, 0.84))
	var feather := _mat(Color(0.97, 0.97, 1.0))
	var gold := _mat(Color(0.90, 0.72, 0.30), 1.2, 0.3)
	var steel := _mat(Color(0.75, 0.80, 0.88), 0.0, 0.25)
	var body := CapsuleMesh.new()
	body.radius = 0.15
	body.height = 0.78
	_part(body, ivory, Vector3(0.0, 0.72, 0.0), floaty)
	var head := SphereMesh.new()
	head.radius = 0.115
	head.height = 0.23
	_part(head, ivory, Vector3(0.0, 1.24, 0.0), floaty)
	var halo := TorusMesh.new()
	halo.inner_radius = 0.10
	halo.outer_radius = 0.125
	_part(halo, gold, Vector3(0.0, 1.43, 0.0), floaty)
	var belt := CylinderMesh.new()
	belt.top_radius = 0.16
	belt.bottom_radius = 0.16
	belt.height = 0.05
	_part(belt, gold, Vector3(0.0, 0.7, 0.0), floaty)
	var blade := BoxMesh.new()
	blade.size = Vector3(0.045, 0.7, 0.02)
	var sword := _part(blade, steel, Vector3(0.3, 1.0, 0.12), floaty)
	sword.rotation_degrees = Vector3(20.0, 0.0, -25.0)
	var wing := BoxMesh.new()
	wing.size = Vector3(0.78, 0.5, 0.03)
	wing_l = Node3D.new()
	wing_l.position = Vector3(-0.1, 1.0, -0.12)
	floaty.add_child(wing_l)
	_part(wing, feather, Vector3(-0.42, 0.12, 0.0), wing_l).rotation_degrees.z = -18.0
	wing_r = Node3D.new()
	wing_r.position = Vector3(0.1, 1.0, -0.12)
	floaty.add_child(wing_r)
	_part(wing, feather, Vector3(0.42, 0.12, 0.0), wing_r).rotation_degrees.z = 18.0


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var label := Label.new()
	label.text = HUD_TEXT
	label.position = Vector2(18, 14)
	label.add_theme_font_size_override("font_size", 18)
	layer.add_child(label)
	hud_label = label
	_play_anim()


func _place_camera() -> void:
	var target := focus * 0.6 + Vector3(0.0, 0.55, 0.0)
	var dir := Vector3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw))
	cam.position = target + dir * dist
	cam.look_at(target, Vector3.UP)


func _process(dt: float) -> void:
	if cam == null:
		return
	t += dt
	if auto:
		yaw += dt * 0.25
		dist = 9.0 + 5.0 * sin(t * 0.45)
	_place_camera()
	# flying stance: hover and beat the wings
	floaty.position.y = HOVER + 0.07 * sin(t * 1.8)
	# the card drifts with the figure once it has slid up; a playable card pulses neon green
	if card != null:
		if seq == null or not seq.is_running():
			card.position.y = card_rest.y + 0.07 * sin(t * 1.8)
		glow.visible = playable
		glow_mat.emission_energy_multiplier = 2.2 + 1.8 * sin(t * 4.0)
	var flap := 0.25 + 0.4 * (0.5 + 0.5 * sin(t * 3.2))
	if wing_l != null:
		wing_l.rotation.y = flap
		wing_r.rotation.y = -flap
	# one continuous dissolve between hologram (far) and figure (near)
	var k := smoothstep(7.0, 11.0, dist)
	for mi in fig_meshes:
		mi.transparency = k
	figure.visible = k < 0.99
	if holo != null:
		holo.modulate.a = k * 0.92
		holo.visible = k > 0.01


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_SPACE and not anim_names.is_empty():
		anim_index = (anim_index + 1) % anim_names.size()
		_play_anim()
	elif ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_G:
		playable = not playable
	elif ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_P:
		_play_card()
	elif ev is InputEventMouseButton and ev.pressed and ev.double_click and ev.button_index == MOUSE_BUTTON_LEFT:
		_play_card()
	elif ev is InputEventMouseButton and ev.pressed:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			auto = false
			dist = clampf(dist - 0.8, 3.0, 18.0)
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			auto = false
			dist = clampf(dist + 0.8, 3.0, 18.0)
	elif ev is InputEventMouseMotion and (ev.button_mask & MOUSE_BUTTON_MASK_RIGHT) != 0:
		auto = false
		yaw -= ev.relative.x * 0.005
		pitch = clampf(pitch + ev.relative.y * 0.005, 0.2, 1.4)


func _snap(name: String) -> void:
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	var out := ProjectSettings.globalize_path("res://shots")
	DirAccess.make_dir_recursive_absolute(out)
	get_viewport().get_texture().get_image().save_png(out.path_join(name + ".png"))


func _shots() -> void:
	auto = false
	yaw = 0.55
	dist = 5.2
	_place_camera()
	_play_card()
	await _snap("play-1-from-hand")
	await get_tree().create_timer(0.35).timeout
	await _snap("play-2-peeling")
	await get_tree().create_timer(1.6).timeout
	yaw = 0.55
	dist = 4.6
	await _snap("near")
	yaw = 2.5
	dist = 5.2
	await _snap("side")
	yaw = 0.55
	dist = 14.0
	await _snap("far")
	get_tree().quit()
