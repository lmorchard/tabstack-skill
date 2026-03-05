SKILL_DIR := tabstack

validate:
	@python3 validate_skill.py $(SKILL_DIR)

package: validate
	rm -f $(SKILL_DIR).skill
	zip -r $(SKILL_DIR).skill $(SKILL_DIR)/ -x "$(SKILL_DIR)/node_modules/*"
